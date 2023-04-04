import * as cdk from 'aws-cdk-lib';
import { BootstrapStack } from './lib/bootstrap-stack';


const app = new cdk.App(
);

const environment = {
	account: '123456789012',
	region: 'eu-central-1',
};

new BootstrapStack(
	app,
	'BootstrapStack',
	{
		env: environment,
	},
);

app.synth();
