# gatsby-plugin-a11y-report

Gatsby plugin for accessibility testing

## Install

`npm install --save gatsby-plugin-a11y-report`

## How to use

### Configure

```js
// gatsby-config.js

module.exports = {
  plugins: [
    // This plugin should only appear in your gatsby-config.js file once.
    //
    // All options are optional.
    {
      resolve: 'gatsby-plugin-a11y-report',
      options: {
        showInProduction: false,
        toastAutoClose: false,
        query: `
          {
            allSitePage(
              filter: {
                path: { regex: "/^(?!/404/|/404.html|/dev-404-page/)/" }
              }
            ) {
              edges {
                node {
                  path
                }
              }
            }
          }
        `,
        ignoreCheck: [
          '/404*',
          '/tag/*'
        ],
        serverOptions: {
          host: 'localhost',
          port: '8341'
        },
        axeOptions: {
          locale: 'ja',
        },
        loggingOptions: {
          result: ['violations', 'incomplete']
        }
      },
    },
  ],
}
```

### in develop mode

`> gatsby develop`

- a11y-report plugin will begin printing a11y warnings to your browser's console.

### in build mode

`> gatsby build`

- a11y-report plugin will start static server & logging accessibility report.