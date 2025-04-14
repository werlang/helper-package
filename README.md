# @werlang/helper-package

This is a helper package for my personal projects, providing classes and functions that I frequently use. 

## Publishing the Package

To publish this package to NPM, follow these steps:

1. Ensure you are authenticated

Create an access token (Classic) with Automation access. Then create a `.env` file in the root of your project and add the following line:

```bash
NPM_TOKEN=YOUR_PERSONAL_ACCESS_TOKEN
```

The npm service from `compose.yaml` will use this token to authenticate with GitHub Packages.

2. Update the version in `package.json` if necessary.

3. Publish the package:

```bash
npm run deploy
```