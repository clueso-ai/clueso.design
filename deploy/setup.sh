#!/bin/bash
# One-time AWS setup for clueso.design in CluesoProduction (131105490139). Idempotent: safe to re-run.
# Run with admin creds: ./deploy/setup.sh
#
# What it owns:
#   - Route 53 zone clueso.design (GoDaddy is the registrar; its nameservers point at this zone)
#   - ACM certs for clueso.design + *.clueso.design in us-east-1 (CloudFront) and ap-south-1 (ALB)
#   - ECR repo clueso-design/web
#   - clueso-design-deploy: the role GitHub Actions assumes, on `main` only
#   - clueso-design-cfn: the role CloudFormation uses to build the stack
set -euo pipefail
export AWS_PAGER=""

PROFILE="${PROFILE:-CluesoProduction}"
REGION=ap-south-1
ACCOUNT=131105490139
DOMAIN=clueso.design
REPO=clueso-design/web
STACK=clueso-design-prod
# The repo has use_immutable_subject on, so GitHub sends the ID-qualified subject. Check with:
#   gh api repos/clueso-ai/clueso.design/actions/oidc/customization/sub
SUB_IMMUTABLE="repo:clueso-ai@84061563/clueso.design@1440904041:ref:refs/heads/main"
SUB_CLASSIC="repo:clueso-ai/clueso.design:ref:refs/heads/main"

aws() { command aws --profile "$PROFILE" "$@"; }
[ "$(aws sts get-caller-identity --query Account --output text)" = "$ACCOUNT" ] || { echo "Wrong account for $PROFILE" >&2; exit 1; }

# Zone
ZONE_ID=$(aws route53 list-hosted-zones-by-name --dns-name "$DOMAIN" --query "HostedZones[?Name=='$DOMAIN.'].Id" --output text | sed 's|/hostedzone/||')
if [ -z "$ZONE_ID" ]; then
  ZONE_ID=$(aws route53 create-hosted-zone --name "$DOMAIN" --caller-reference "$DOMAIN-$(date +%s)" --query HostedZone.Id --output text | sed 's|/hostedzone/||')
fi
echo "Zone $ZONE_ID. Nameservers to set at GoDaddy:"
aws route53 get-hosted-zone --id "$ZONE_ID" --query DelegationSet.NameServers --output text

# Certs. Same domain + account gives the same validation CNAME in both regions.
for R in us-east-1 $REGION; do
  ARN=$(aws acm list-certificates --region "$R" --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn" --output text | tr '\t' '\n' | grep arn: | head -1 || true)
  if [ -z "$ARN" ]; then
    ARN=$(aws acm request-certificate --region "$R" --domain-name "$DOMAIN" --subject-alternative-names "*.$DOMAIN" \
      --validation-method DNS --tags Key=Project,Value=clueso-design --query CertificateArn --output text)
    sleep 10
  fi
  echo "Cert $R: $ARN"
  REC=$(aws acm describe-certificate --region "$R" --certificate-arn "$ARN" --query 'Certificate.DomainValidationOptions[0].ResourceRecord' --output json)
  NAME=$(echo "$REC" | python3 -c 'import json,sys;print(json.load(sys.stdin)["Name"])')
  VALUE=$(echo "$REC" | python3 -c 'import json,sys;print(json.load(sys.stdin)["Value"])')
  aws route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" --change-batch \
    "{\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"$NAME\",\"Type\":\"CNAME\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"$VALUE\"}]}}]}" >/dev/null
done

# ECR
aws ecr describe-repositories --region "$REGION" --repository-names "$REPO" >/dev/null 2>&1 || \
  aws ecr create-repository --region "$REGION" --repository-name "$REPO" --image-scanning-configuration scanOnPush=true >/dev/null
aws ecr put-lifecycle-policy --region "$REGION" --repository-name "$REPO" --lifecycle-policy-text \
  '{"rules":[{"rulePriority":1,"description":"keep 30 images","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":30},"action":{"type":"expire"}}]}' >/dev/null

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

# CloudFormation execution role: what the stack itself is allowed to create.
cat > "$TMP/cfn-trust.json" <<JSON
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"cloudformation.amazonaws.com"},"Action":"sts:AssumeRole"}]}
JSON
cat > "$TMP/cfn-policy.json" <<JSON
{"Version":"2012-10-17","Statement":[
  {"Effect":"Allow","Action":["ecs:*","elasticloadbalancing:*","cloudfront:*","logs:*"],"Resource":"*"},
  {"Effect":"Allow","Action":["ec2:Describe*","ec2:CreateSecurityGroup","ec2:DeleteSecurityGroup","ec2:AuthorizeSecurityGroupIngress","ec2:RevokeSecurityGroupIngress","ec2:AuthorizeSecurityGroupEgress","ec2:RevokeSecurityGroupEgress","ec2:CreateTags","ec2:DeleteTags","ec2:GetManagedPrefixListEntries"],"Resource":"*"},
  {"Effect":"Allow","Action":["iam:CreateRole","iam:DeleteRole","iam:GetRole","iam:PassRole","iam:TagRole","iam:UntagRole","iam:UpdateAssumeRolePolicy","iam:AttachRolePolicy","iam:DetachRolePolicy","iam:PutRolePolicy","iam:DeleteRolePolicy","iam:GetRolePolicy","iam:ListRolePolicies","iam:ListAttachedRolePolicies"],"Resource":"arn:aws:iam::$ACCOUNT:role/$STACK-*"},
  {"Effect":"Allow","Action":["route53:ChangeResourceRecordSets","route53:ListResourceRecordSets","route53:GetHostedZone"],"Resource":"arn:aws:route53:::hostedzone/$ZONE_ID"},
  {"Effect":"Allow","Action":["route53:GetChange","route53:ListHostedZones"],"Resource":"*"},
  {"Effect":"Allow","Action":["acm:DescribeCertificate","acm:ListCertificates"],"Resource":"*"},
  {"Effect":"Allow","Action":["iam:CreateServiceLinkedRole"],"Resource":"*","Condition":{"StringLike":{"iam:AWSServiceName":["ecs.amazonaws.com","elasticloadbalancing.amazonaws.com"]}}}
]}
JSON
aws iam get-role --role-name clueso-design-cfn >/dev/null 2>&1 || \
  aws iam create-role --role-name clueso-design-cfn --assume-role-policy-document "file://$TMP/cfn-trust.json" >/dev/null
aws iam put-role-policy --role-name clueso-design-cfn --policy-name stack --policy-document "file://$TMP/cfn-policy.json"

# GitHub deploy role: push the image and update the one stack, nothing else.
cat > "$TMP/gh-trust.json" <<JSON
{"Version":"2012-10-17","Statement":[{"Effect":"Allow",
  "Principal":{"Federated":"arn:aws:iam::$ACCOUNT:oidc-provider/token.actions.githubusercontent.com"},
  "Action":"sts:AssumeRoleWithWebIdentity",
  "Condition":{"StringEquals":{"token.actions.githubusercontent.com:aud":"sts.amazonaws.com"},
               "StringLike":{"token.actions.githubusercontent.com:sub":["$SUB_IMMUTABLE","$SUB_CLASSIC"]}}}]}
JSON
cat > "$TMP/gh-policy.json" <<JSON
{"Version":"2012-10-17","Statement":[
  {"Effect":"Allow","Action":"ecr:GetAuthorizationToken","Resource":"*"},
  {"Effect":"Allow","Action":["ecr:BatchCheckLayerAvailability","ecr:BatchGetImage","ecr:CompleteLayerUpload","ecr:DescribeImages","ecr:GetDownloadUrlForLayer","ecr:InitiateLayerUpload","ecr:PutImage","ecr:UploadLayerPart"],"Resource":"arn:aws:ecr:$REGION:$ACCOUNT:repository/$REPO"},
  {"Effect":"Allow","Action":["cloudformation:CreateChangeSet","cloudformation:DescribeChangeSet","cloudformation:ExecuteChangeSet","cloudformation:DeleteChangeSet","cloudformation:DescribeStacks","cloudformation:DescribeStackEvents","cloudformation:GetTemplateSummary","cloudformation:ListChangeSets"],"Resource":"arn:aws:cloudformation:$REGION:$ACCOUNT:stack/$STACK/*"},
  {"Effect":"Allow","Action":"cloudformation:ValidateTemplate","Resource":"*"},
  {"Effect":"Allow","Action":"iam:PassRole","Resource":"arn:aws:iam::$ACCOUNT:role/clueso-design-cfn"},
  {"Effect":"Allow","Action":["cloudfront:CreateInvalidation","cloudfront:GetInvalidation"],"Resource":"*"}
]}
JSON
aws iam get-role --role-name clueso-design-deploy >/dev/null 2>&1 || \
  aws iam create-role --role-name clueso-design-deploy --assume-role-policy-document "file://$TMP/gh-trust.json" >/dev/null
aws iam update-assume-role-policy --role-name clueso-design-deploy --policy-document "file://$TMP/gh-trust.json"
aws iam put-role-policy --role-name clueso-design-deploy --policy-name deploy --policy-document "file://$TMP/gh-policy.json"

echo "Done. Zone $ZONE_ID, roles clueso-design-deploy + clueso-design-cfn, ECR $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$REPO"
