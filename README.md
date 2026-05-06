# e4nu Website

This repository contains the static website for the e4nu collaboration.

The site is made from plain HTML, CSS, JavaScript, JSON data files, and images. There is no build system and no package installation step: you only need Git, a web browser, and Python to run it locally.

## What You Need

Before starting, make sure you have:

- **Git**, used to download the website code.
- **Python 3**, used to start a small local web server.

On macOS, Git and Python are often already available. To check, open Terminal and run:

```sh
git --version
python3 --version
```

## Clone the Repository

Open Terminal, move to the folder where you keep projects, and clone the repository:

```sh
cd ~/Desktop
git clone https://github.com/Pabce/e4nuweb.git
cd e4nuweb
```

All commands below assume you are inside the `e4nuweb` folder.

## Run the Website Locally

Start a local web server with:

```sh
python3 -m http.server 8000
```

Leave that Terminal window open while you work on the site. You should see output similar to:

```text
Serving HTTP on :: port 8000 ...
```

Now open your browser and go to:

```text
http://localhost:8000/
```

Useful local pages:

- Home page: `http://localhost:8000/`
- Publications page: `http://localhost:8000/publications.html`

To stop the local server, return to the Terminal window where it is running and press:

```text
Control-C
```

## Making Changes

Most edits happen in these files and folders:

- `index.html`: the main home page.
- `publications.html`: the publications page.
- `assets/css/`: site styles.
- `assets/js/`: site behavior.
- `assets/data/`: editable JSON data used by the website.
- `assets/images/`, `assets/photos/`, and `assets/logos/`: image assets.

After saving a change, refresh the browser page to see it.

## Collaborating with the Develop Preview

The live production site is published from the `main` branch at:

```text
https://e4nu.org/
```

Collaborators should make shared work on the `develop` branch first:

```sh
git switch develop
git pull
```

After making and testing changes locally, commit and push them to `develop`:

```sh
git status
git add path/to/changed-file
git commit -m "Describe the website change"
git push origin develop
```

Every push to `develop` automatically updates the preview site:

```text
https://pabce.github.io/e4nuweb-develop/
```

Use the preview site to check the online result before opening or merging a pull request into `main`. Merging into `main` updates the production site at `https://e4nu.org/`.

## Troubleshooting

If `http://localhost:8000/` does not open, check that the Terminal server is still running and that you started it from inside the `e4nuweb` folder.

If port `8000` is already in use, run the server on another port:

```sh
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

If the page appears without styling, confirm that you are connected to the internet. The current site loads Tailwind CSS and fonts from external services.
