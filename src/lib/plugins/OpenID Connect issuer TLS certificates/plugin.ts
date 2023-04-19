import * as awsCdkLibApiPlugin from 'aws-cdk/lib/api/plugin';

import * as contextProvider from './context-provider';


export
class Plugin
implements awsCdkLibApiPlugin.Plugin
{
	public readonly version = "1";

	public init
	(
		host : awsCdkLibApiPlugin.PluginHost,
	)
	: void
	{
		host.registerContextProviderAlpha(
			"OpenID Connect issuer TLS certificates",
			new contextProvider.ContextProvider(
			),
		);
	};
};
