# @werlang/helper-package

This is a helper package for my personal projects, providing classes and functions that I frequently use. 

## Publishing the Package

To publish this package to GitHub Packages, follow these steps:

1. Ensure you are authenticated with GitHub Packages:

```bash
npm login --registry=https://npm.pkg.github.com
```

For that you need to have a personal access token with the `write:packages` scope. You can create one in your GitHub account settings under Developer settings > Personal access tokens.

2. Update the version in `package.json` if necessary.

3. Publish the package:

```bash
npm publish
```

4. Verify the package is published by checking the GitHub Packages section of your repository.