# Development Guide

To future Edupulse developers... This guide will help explain how to develop this project.

For starters, start with markup files in [template_docs](../template_docs/get-started.md). These will get you started on spinning up the app.

## Starting Development

The current state of the code is in 'production' mode. It's runnable, but tedious for development as it takes a long time to build the frontend.
To start 'development' mode, we need to change just a few things. To find these changes, see (and apply) the patch file in [devMode.patch](./dev_patches/devMode.patch)
Don't push these changes to the main branch as the deployment script in the deployment guide will reflect these changes and may result in unexpeted results/performance on the website.

Future work would be to have a development vs production pipeline/branch that can be worked on and a CICD pipeline to automatically convert the two.


