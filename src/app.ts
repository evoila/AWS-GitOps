import * as cdk from 'aws-cdk-lib';


const app = new cdk.App(
);

const environment = {
	account: '123456789012',
	region: 'eu-central-1',
};

app.synth();
