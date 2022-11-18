---
title:  "Tutorial: Deploy 11ty on GitHub Pages using GitHub Actions"
description: "Combining 11ty with GitHub Pages, GitHub Actions, git lts and the 11ty-images plugin"
date:   2022-12-10
layout: layouts/post.njk
location: Cambutal, Panama
tags:
- en 
- tutorial
- code
- 11ty
---
## Introduction & Motivation

I recently started this blog. Coding is a hobby-turned-profession since forever, so I wanted a blogging environment that I can play around with. Since I like to go to exotic locations that sometimes come with an unreliable internet connection, I wanted the system to have the following capabilities/properties:

- write/test/edit without a working internet connection
- upload updates in bulk once I have a working internet connection
- use `git` to track changes
- lightweight statically served html/css/js without a heavy database backend that complicates stuff
- tinker with javascript, the de-facto language of the web

After trying out jenkins (githubs in-house static site generator written in ruby), I quickly switched to [11ty](https://github.com/11ty). The project seems more modern and more active. Also, I didn't want to learn ruby just for maintaining & extending the blog.

## Deployment

11ty is unopinionated about a lot of things by design, deployment included. The excellent [11ty documentation](https://www.11ty.dev/docs/deployment/) has a whole section on deployment, listing different options. Although it's intriguing to try something new or use an option that seems a little more modern and comfortable, I wanted to stick to the basics: Why grow the tech stack if I could just use [GitHub Pages](https://pages.github.com/)? Together with [GitHub Actions](https://docs.github.com/en/actions) the build & deploy process could be fully automized when pushing to the main branch on my remote git server.

### Looking at existing solutions & additional requirements

The [1tty deployment community tutorials](https://www.11ty.dev/docs/deployment/#community-tutorials) show three entries describing possible deployment routes on GitHub Pages. Looking at all of them I've decided that

- I didn't want to [use yet another platform](https://snook.ca/archives/servers/deploying-11ty-to-gh-pages) (e.g. [Travis CI](https://www.travis-ci.com/))
- I wanted to use the (new) [Github Actions for GitHub Pages](https://github.blog/2022-08-10-github-pages-now-uses-actions-by-default/) flow instead of the outdated "Deploy from a branch" configuration. Other options from the 11ty docs also use GitHub Actions ([here](https://quinndombrowski.com/blog/2022/05/07/hosting-eleventy-on-github-pages/) and [here](https://github.com/marketplace/actions/eleventy-action)). What they do is checkout the main branch, use 11ty to build the static site and push that to the GitHub Pages branch (e.g. `gh-pages`). That itself triggers the GitHub Pages build & deployment process (in that flow a black box).
- I didn't want to spin up a dedicated docker container inside the GitHub action just to build the static site. There might be advantages to having a fully reproducible build environment. It might also be that if you're holding a hammer in your hand, every problem starts to look a bit like a nail. How is a docker container different to what's defined in a GitHub Action (which might run inside a docker)
- I wanted to avoid using 3rd party repositories/actions as much as possible. Of course, re-inventing the wheel will not bring any progress. But growing my skill in something as useful & central as GitHub Actions is definitely worth it for me.

{% image "img/11ty-gh-pages/Screenshot from 2022-12-10 11-08-20.png", "On GitHub under `Setting > Pages` the user can choose a source" %}

## My Solution

The workflow definition can be found on the [my blogs GitHub repo](https://github.com/maschlr/adapt.abilit.ee/38c05f251c12be9f58789af55419da92724bca93/.github/workflows/elevenly_build.yml). I'm going to walk throgh the steps involved.

### Hook

```yml
on:
  push:
    branches:
      - main
```

My build & deploy process should be triggered on each push to the `main` branch.

### Build

```yml
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master
        with:
          lfs: true
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install NPM packages
        run: npm install    
      - name: run build
        run: npm run build   
      - name: Upload Artifact
        uses: actions/upload-pages-artifact@main
```

The [`actions` GitHub account](https://github.com/actions) holds all actions that are maintained by GitHub. I use the following three:

- [actions/checkout@master](https://github.com/actions/checkout) does what the name suggests: it checks out a branch into the action workspace to work with. An important caveat here is the option: `lfs: true` is not default. I'm using `git lfs` to save my images. Without this option, the images will not be checked-out into the workspace.
- [actions/setup-node@v3](https://github.com/actions/setup-node): setup node.js in the current workspace
- [actions/upload-pages-artifact@main](https://github.com/actions/upload-pages-artifact): again, explicit naming. Since this action uses the `_site` folder as default, there's no need to pass any arguments.

### Integrating 11ty images + `git lfs`

When using the [`eleventy-img` plugin](https://github.com/11ty/eleventy-img), it's important to [define the output directory](https://www.11ty.dev/docs/plugins/image/#output-directory) to be the build target directory as suggested in the docs (`/_site/img/`). Not doing that led to images not being present in the resulting build artifact/GitHub Page. To me, the process of debugging that was trial & error. What's happening behind the scenes (e.g. what the build artifact looks like) was not transparent to me. I'd be grateful for some tips on how to properly debug github actions.

## Deploy

```yml
  # Deploy job
  deploy:
    # Add a dependency to the build job
    needs: build

    # Grant GITHUB_TOKEN the permissions required to make a Pages deployment
    permissions:
      pages: write      # to deploy to Pages
      id-token: write   # to verify the deployment originates from an appropriate source

    # Deploy to the github-pages environment
    environment:
      name: github-pages
      url: ${% raw %}{{ steps.deployment.outputs.page_url }}{% endraw %}

    # Specify runner + deployment step
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v1
```

To run the `deploy` step, a successfully finished `build` step is necessary. In the `deploy` step, some variables need to be defined. They are all as described in the [`actions/deploy-pages`](https://github.com/actions/deploy-pages) repo.

## Conclusion

By implementing a GitHub Actions workflow for building & deploying my 11ty blog using no 3rd party repos/services, I've found a robust solution that considers all requirements that I have. I enjoyed learning about GitHub Actions, a powerful tool available to all projects that are hosted on GitHub.
