# Secrets in ECS Demo Stack [DRAFT]

Description: A basic web app that retrieves data from an RDS database and displays it via a Fargate Service (v1)

Prerequisites:
* An AWS Account with an IAM user with an `AdministratorAccess` Policy Attached
* Access and Secret Keys for the above account

## Directions:
1) Install Node, NPM and AWS CDK and AWS CLI on your local environment (built using Node 14.15.4)

2) Run `aws configure` with appropriate Account Access Key ID, Secret Key, Region, and output format JSON

3) Clone this repo

4) Within this repo directory `./bin` - create a .env file with the following values
```
AWS_ACCOUNT_ID=<YOUR_ACCOUNT_ID>
AWS_REGION=<YOUR_PREFERRED_REION>
```

5) In root of this repo, run `npm install`

6) Test CDK output - run `cdk synth` - you should see a dir called `cdk.out` with CFN templates created, and the following to stdout:
```
Successfully synthesized to <YOUR PATH>/secret-ecs-cdk-example/cdk.out
Supply a stack id (VPCStack, RDSStack, ECSStack) to display its template.
```

7) Deploy the stack `cdk deploy --all require-approval never`

The deployment will take approx 10-15mins. 

Note the output of the `ECSStack.LoadBalancerDNS` at the end of the process.   Take that string, and run in a terminal:

`curl ECSSt-Farga-xxxxx-xxxxxx.whateverregion.elb.amazonaws.com/migrate` - this populates the DB with a single piece of data - it should return "undefined + undefined"

Next - run the main URL:
`curl ECSSt-Farga-xxxxx-xxxxxx.whateverregion.elb.amazonaws.com/todos`


### Successful output (V1 test only):
```
[{"id":1,"title":"Do something","description":"Do Something good","isFinished":true}]
```

## WHAT DID THIS ALL DO??

1) Creates a VPC into which everything is setup
2) Creates a RDS Postgres 12.4 micro instance (in a public subnet for now), and saves the secrets into AWS Secrets Manager
3) Creates an ECS Fargate Cluster and ECS Fargate Task that points to `mptaws/secretecs` image on hub.docker.com - all this app does is have a single container with a typescript app that accesses a postgres database
    * The cluster fetches the secrets created during the RDS stack from AWS Secrets Manager and sends them along to the web container via environment variables
    * The typescript app gets those environment variables to build the connection string to the database to fetch the output

Open the console and explore the created resources (VPC, RDS, Secrets Manager, ECS Cluster)

### Cleanup

Run `cdk destroy --all`