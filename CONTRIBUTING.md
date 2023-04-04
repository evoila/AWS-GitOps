# Contribution guidelines

## Dependencies

This AWS CDK app requires:

- [Node.js][], an implementation of JavaScript;
- the [Node.js package manager npm][npm CLI] (instead of [Yarn][] or [pnpm][]);
- [TypeScript][];
- the [AWS CDK library for TypeScript][]; and
- the [AWS CDK command-line interface][AWS CDK CLI].

Additionally, developing this AWS CDK app requires:

- [ESLint][].

The version of [Node.js][] should match the [version range][npm version ranges] given for the key `node` in the [object `engines`][package.json engines] in the [file `package.json`](./package.json).
[Node.js][] versions may be installed in [different ways][Node.js installation].

Because [Node.js][] includes the [package manager npm][npm CLI] and all other dependencies of this AWS CDK app are distributed as Node.js packages,
you just need to install a compatible version of [Node.js][] and then execute the following command:

```
npm ci
```

All dependencies will be [installed locally][npm install local] and therefore will not conflict with any of your other projects.


[AWS CDK CLI]: https://docs.aws.amazon.com/cdk/v2/guide/cli
[AWS CDK library for TypeScript]: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme
[ESLint]: https://www.eslint.org/
[Node.js installation]: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
[Node.js]: https://www.nodejs.org/
[npm CLI]: https://docs.npmjs.com/cli/v9/commands/npm
[npm install local]: https://docs.npmjs.com/downloading-and-installing-packages-locally
[npm version ranges]: https://github.com/npm/node-semver#ranges
[package.json engines]: https://docs.npmjs.com/cli/v9/configuring-npm/package-json#engines
[pnpm]: https://pnpm.io/
[TypeScript]: https://www.typescriptlang.org/
[Yarn]: https://yarnpkg.com/
