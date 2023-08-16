#!/bin/bash

region='us-west-2'

if [ ! -n "$2" ]; then
    account_id=`aws sts get-caller-identity --query "Account" --output text`
else
    account_id="450591560890"
fi

ts=`date +%y-%m-%d-%H-%M-%S`
unique_tag="$account_id-$ts"


echo "CDK_DEFAULT_ACCOUNT=${account_id}" > .env
echo "CDK_DEFAULT_REGION=${region}" >> .env
echo "existing_vpc_id=optional" >> .env