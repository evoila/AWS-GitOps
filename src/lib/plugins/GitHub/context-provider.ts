import * as awsCdkLibApiPlugin from 'aws-cdk/lib/api/plugin';
import * as awsCdkLibCloudAssemblySchema from "aws-cdk-lib/cloud-assembly-schema";
import * as octokit from 'octokit';

import * as self_platform_GitHub from '../../platforms/GitHub';


export
interface ContextQuery
extends awsCdkLibCloudAssemblySchema.PluginContextQuery
{
	readonly host : string;
	readonly repository : self_platform_GitHub.RepositoryProps;
};

export
type ContextValue = string;

export
class ContextProvider
implements awsCdkLibApiPlugin.ContextProviderPlugin
{
	public getValue
	(
		args : ContextQuery,
	)
	: Promise<ContextValue>
	{
		const octoClient = new octokit.Octokit(
			{
				baseUrl: (
					args.host === 'github.com'
					?
					undefined
					:
					`https://${args.host}/api/v3`
				),
			},
		);
		const promise = new Promise<ContextValue>(
			function(
				resolve,
				reject,
			)
			{
				octoClient.request(
					'GET /repos/{owner}/{repository}',
					{
						headers: {
							'X-GitHub-Api-Version': '2022-11-28',
						},
						owner: args.repository.owner,
						repository: args.repository.name,
					},
				)
				.then(
					function(
						response,
					)
					{
						const defaultBranch = response.data['default_branch'];
						resolve(
							defaultBranch,
						);
					},
				)
				.catch(
					function(
						reason,
					)
					{
						console.log(
							'could not retrieve default branch for GitHub repository `%s/%s` at %s',
							args.repository.owner,
							args.repository.name,
							args.host,
						);
						/*
						resolve(
							null,
						);
						*/
						reject(
							`could not retrieve default branch for GitHub repository \`${args.repository.owner}/${args.repository.name}\` at ${args.host}: ${reason}`,
						);
					},
				)
				;
			},
		);
		return promise;
	};
};
