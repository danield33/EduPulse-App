# Development Guide

To future Edupulse developers... This guide will help explain how to develop this project.

For starters, start with markup files in [template_docs](../template_docs/get-started.md). These will get you started on
spinning up the app
and how to perform database migrations which should be done when editing/creating/deleting tables.

<!-- TOC -->
* [Development Guide](#development-guide)
  * [Starting Development](#starting-development)
* [Project Details](#project-details)
  * [Tools](#tools)
  * [Backend](#backend)
<!-- TOC -->

## Starting Development

The current state of the code is in 'production' mode. It's runnable but tedious for development as it takes a long time
to build the frontend.
To start 'development' mode, we need to change just a few things. To find these changes, see (and apply) the patch file
in [devMode.patch](./dev_patches/devMode.patch)
Don't push these changes to the main branch as the deployment script in the deployment guide will reflect these changes
and may result in unexpeted results/performance on the website.

Future work would be to have a development vs production pipeline/branch that can be worked on and a CICD pipeline to
automatically convert the two.

# Project Details

## Tools

* Frontend: Next.js + TailwindCSS
* Backend: FastAPI (python)
    * Key Library: FFmpeg
* Database: PostgreSQL
* AI Tools:
    * Hume.ai: speech synthesis
    * OpenAI: script generation
* Docker

The frontend, backend, and database are each separated in their own docker containers. The template_docs have options to
run this project without Docker, but I wouldn't recommend it.

## Backend

The backend has multiple API's, most of which aren't being used on the frontend and could be potential for future work
to clean them up.
Visit `localhost:8000/docs` or `localhost:8000/api/docs` for API information.



# Possible Future Work

## Frontend

On the frontend, there's a number of things that could need implemented/fixing

* Editing lesson names
* Deleting lessons
* Better lesson search
	* Adding some kind of "search" for lessons like youtube
* Feature for seeing whos speaking in each lesson / subtitles.
	* When a dialogue starts, add some kind of overlay that says who is speaking or subtitles with character names.


## Backend

* Move lesson videos to AWS S3 for better reliability. On the host, the files could corrupt or some other issues but S3 is more redundant and reliable
* Better ffmpeg updates - instead of re-rendering the entire video, determine what segments were changed and only update them (Fast loading times).
* Parallelize ffmpeg. When ffmpeg is running, it uses most/all the system's cores leaving nothing able to process. This prevents users from navigating the website while a lesson is rendering.
	* Could also move the rendering process to an AWS lambda service
