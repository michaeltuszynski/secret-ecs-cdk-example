####Setting up an example app using AWS Secrets Manager####

[assumptions - Cloud9 and proper aws credentials setup]

Throughout this tutorial on secrets, we are going to be working with a very simple Todo add that has a CRUD interface to a Postgres Database.   Here is a diagram of the infrastructure we are going to build:

![Secrets Diagram](./docs/Secrets.png)

When incoming web traffic passes through the load balancer to our ECS Cluster, the application running in the container reads environment vari
ables that contain the sensitive credentials for connecting to the DB.   

These environment variables populated by a centralized secrets store.  We are going to use both AWS Secrets Manager and System Manager Parameter Store.   Both stores have the ability to get and set secrets securly and programatically.   Both stores hold secrets in the form of key/values pairs.

####Parameter Store vs Secrets Manager

| Feature | Parameter Store | Secrets Manager |
| ------- | --------------- | --------------- |
| Storage Size | 4kb,8kb| 10kb |
| KMS Encryption | Yes | Yes (supports [CMD][cmk-link])|
| Password Generation | No | Yes |
| Secret Rotation | No | Yes |
| Cross Account Access | No | Yes |
| Pricing | [Guide][ssm-pricing-link] | [Guide][sm-pricing-link] | 

As a best practice in working with secrets in any context, using AWS Secrets Manager is the way to go.   It has features that are purpose-built for managing secrets securely. 

Secrets Manager stores, retrieves, rotates, encrypts and monitors the use of secrets within your application. Secrets Manager uses AWS KMS for encryption with IAM roles to restrict access to the services and CloudTrial for recording the API calls made for secrets.

Lets setup this application and demo the integration. You can either clone the [repository][repo-url] or following along below. 

In a new terminal window in your Cloud9 environment: (note that the Cloud9 environment comes preloaded with node and npm.  If you are doing this tutorial locally you will need to setup node and npm - [NVM][nvm-link] is recommended.).

* Install/Update the CDK in the environment `npm install -g aws-cdk`
* Create and move into a new project directory `mkdir cdk-sample-app && cd cdk-sample-app`
* Initialize a new CDK Application `cdk init app --language typescript` (note:  `app` creates a blank app, supported languages can be found [here][cdk-link]

By convention, the main application resides inside `bin/cdk-sample-app.ts`.   Replace the contents of this file with the code below.  

``` import { App } from '@aws-cdk/core';
import { VPCStack } from '../lib/vpc-stack';
import { RDSStack } from '../lib/rds-stack';
import { ECSStack } from '../lib/ecs-stack';

const cdkEnv = { 
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.AWS_ACCOUNT_ID, 
    region: process.env.CDK_DEPLOY_REGION || process.env.AWS_REGION 
}

const app = new App();

const vpcStack = new VPCStack(app, 'VPCStack',{
    env: cdkEnv
});

const rdsStack = new RDSStack(app, 'RDSStack', {
    vpc: vpcStack.vpc,
    env: cdkEnv
});

rdsStack.addDependency(vpcStack);

const ecsStack = new ECSStack(app, "ECSStack", {
     vpc: vpcStack.vpc,
     dbSecretArn: rdsStack.dbSecret.secretArn,
     env: cdkEnv
});

ecsStack.addDependency(rdsStack);
```
Here we are creating 3 Stacks that setup a VPC, a Postgres RDS instance, and an ECS Cluster that will contain our app that needs access to the secrets contained within secrets manager. 

Next, create the 3 lib files referenced in the previous file in the `lib` folder.

**lib/vpc-stack.ts**

```
import { App, Stack, StackProps } from '@aws-cdk/core';
import { Vpc } from '@aws-cdk/aws-ec2'

export class VPCStack extends Stack {
    readonly vpc: Vpc;

    constructor(scope: App, id: string, props: StackProps) {
        super(scope, id, props);

        const vpcName = scope.node.tryGetContext("vpcName");

        this.vpc = new Vpc(this, `${vpcName}`, {
            cidr: '10.0.0.0/16'
        })
    }
}
```

**lib/rds-stack.ts**

```
import { App, StackProps, Stack, CfnOutput } from "@aws-cdk/core";
import {
    DatabaseSecret, DatabaseInstance, DatabaseInstanceEngine,
    PostgresEngineVersion, Credentials, StorageType
} from '@aws-cdk/aws-rds';
import { Vpc, Port, SubnetType, InstanceType } from '@aws-cdk/aws-ec2';

export interface RDSStackProps extends StackProps {
    vpc: Vpc
}

export class RDSStack extends Stack {

    readonly dbSecret: DatabaseSecret;
    readonly postgresRDSInstance: DatabaseInstance;

    constructor(scope: App, id: string, props: RDSStackProps) {
        super(scope, id, props);

        const dbUser = this.node.tryGetContext("dbUser");
        const dbName = this.node.tryGetContext("dbName");
        const dbPort = this.node.tryGetContext("dbPort");
        const dbInstanceType = this.node.tryGetContext("instanceType");

        this.dbSecret = new DatabaseSecret(this, 'DbSecret', {
            username: dbUser
        });

        this.postgresRDSInstance = new DatabaseInstance(this, 'Postgres-rds-instance', {
            engine: DatabaseInstanceEngine.postgres({
                version: PostgresEngineVersion.VER_12_4
            }),
            instanceType: new InstanceType(dbInstanceType),
            vpc: props.vpc,
            vpcSubnets: { subnetType: SubnetType.PUBLIC },
            storageEncrypted: false,
            multiAz: false,
            autoMinorVersionUpgrade: false,
            allocatedStorage: 25,
            storageType: StorageType.GP2,
            deletionProtection: false,
            credentials: Credentials.fromSecret(this.dbSecret, dbUser),
            databaseName: dbName,
            port: dbPort,
        });

        this.postgresRDSInstance.connections.allowFromAnyIpv4(Port.tcp(dbPort));

        new CfnOutput(this, 'POSTGRES_URL', { value: this.postgresRDSInstance.dbInstanceEndpointAddress });

    }
}
```

In above example, we are referencing contest variables from `cdk.json` in the root of the project via the `node.tryGetContext`.   Open `cdk.json` in the root of the project and add the following to the `context` object:

```
    "vpcName": "ecsSecretsVpc",
    "dbName": "tododb",
    "dbUser": "postgres",
    "dbPort": 5432,
    "containerPort": 4000,
    "containerImage": "mptaws/secretecs",
    "instanceType": "t2.micro"
```

Inside the constructor function, we use `DatabaseSecret` to auto-generate a random password and store it into Secrets Manager with the given username defined in context:
```
        this.dbSecret = new DatabaseSecret(this, 'DbSecret', {
            username: dbUser
        });
        ```
What is notable here is that all pertinent database information is stored inside the new secret (generated hostname, port, username, password)

`lib/ecs-stack.ts`

```
import { App, Stack, StackProps, CfnOutput } from '@aws-cdk/core';
import { Vpc } from "@aws-cdk/aws-ec2";
import { Cluster, ContainerImage, Secret as ECSSecret } from "@aws-cdk/aws-ecs";
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns';
import { Secret } from '@aws-cdk/aws-secretsmanager';

export interface ECSStackProps extends StackProps {
  vpc: Vpc
  dbSecretArn: string
}

export class ECSStack extends Stack {

  constructor(scope: App, id: string, props: ECSStackProps) {
    super(scope, id, props);

    const containerPort = this.node.tryGetContext("containerPort");
    const containerImage = this.node.tryGetContext("containerImage");
    const creds = Secret.fromSecretCompleteArn(this, 'pgcreds', props.dbSecretArn);

    const cluster = new Cluster(this, 'Cluster', {
      vpc: props.vpc
    });
  
    const fargateService = new ApplicationLoadBalancedFargateService(this, "FargateService", {
      cluster,
      taskImageOptions: {
        image: ContainerImage.fromRegistry(containerImage),
        containerPort: containerPort,
        enableLogging: true,
        secrets: {
          POSTGRES_USER: ECSSecret.fromSecretsManager(creds!, 'username'),
          POSTGRES_PASS: ECSSecret.fromSecretsManager(creds!, 'password'),
          POSTGRES_HOST: ECSSecret.fromSecretsManager(creds!, 'host'),
          POSTGRES_PORT: ECSSecret.fromSecretsManager(creds!, 'port'),
          POSTGRES_NAME: ECSSecret.fromSecretsManager(creds!, 'dbname')
        }
      },
      desiredCount: 1,
      publicLoadBalancer: true
    });

    new CfnOutput(this, 'LoadBalancerDNS', { value: fargateService.loadBalancer.loadBalancerDnsName });
  }
}
```
Here, we import `containerPort`, `containerImage`, and the secrets object itself via `Secret.fromSecretCompleteArn`.   This value is passed down from the previously created `RDSStack` object via the stackprops `props` object. 

Next, we use the `ecs_patterns` library which provides higher-level Amazon ECS constructs which follow common architectural patterns.   You can read more about `ecs_patterns` [here][ecs-patterns-link]

Here, we use `ApplicationLoadBalancedFargateService`  which sets up a Fargate service running on an ECS cluster fronted by an application load balancer.  The construct takes a container image into `taskImageOptions` 




[ecs-patterns-link]: <https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ecs-patterns-readme.html>
[cmk-link]: <https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#master_keys>
[ssm-pricing-link]: <https://aws.amazon.com/systems-manager/pricing/#Parameter_Store>
[sm-pricing-link]: <https://aws.amazon.com/secrets-manager/pricing/>
[repo-url]: <http://github.com/mptaws/secret-ecs-example>
[cdk-link]: <https://docs.aws.amazon.com/cdk/latest/guide/cli.html>
[nvm-link]: <https://github.com/nvm-sh/nvm>
