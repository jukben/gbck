<div align="center">
 <img src="https://user-images.githubusercontent.com/8135252/35011531-bf751eb2-fb06-11e7-94c6-0531765d29e2.png" alt="Gbck logo" title="Gbck" height="150" />

<div><strong>G</strong>it <strong>B</strong>a<strong>c</strong><strong>k</strong>up</div>
</div>

## Table of Contents

* [Introduction](#introduction)
* [Install](#install)
* [Usage](#usage)
  * [Create new project](#create-new-project)
  * [List available projects](#list-available-projects)
  * [Backup a project](#backup-a-project)
* [Contributing](#contributing)
* [License](#license)

## Introduction

Gbck is an intuitive lightweight tool for an easy and seamless backup of your files e.g. various [config files](https://github.com/jukben/dotfiles). It's built to be an easy and flexible as possible.
All you have to do is just to create the config file containing all files (and/or commands' stdouts) you desire to back up.

## Install

`npm i -g gbck`

_Requirement: You need to have Node 7.5+ installed on your machine_

## Usage

<a href="https://asciinema.org/a/R05f37oeD1vMicb8Dh9eC63Zv" target="_blank"><img src="https://asciinema.org/a/R05f37oeD1vMicb8Dh9eC63Zv.png" height="350"/></a>

```
Usage: gbck [projects]

Options:
-i, --init                Create new project  
-f, --force               Along with -i create new project even if already exists
-l, --list                List all project sorted by its latest updates
-v, --version             Print version
-h, --help                Show this help
--auto-commit             Don't ask for commit message and use default one
```

Note: gbck stores every information under `~/.gbck`

### Create new project

For a creation of a new project just run `gbck --init`.

You project will be saved inside `~/.gbck/<project-name>/`

* `config`
* `README.md`
* `.vsc` - the actual Git repository folder

If you use `--force` or `-f` option you will be able rewrite already existing project.

Now it's time to configure it!

> Check out this example [configuration](https://github.com/jukben/dotfiles/blob/master/.gbck/config) 💪

`config` has to be valid JSON:

* Fields `url: string`, `readme: string`, `entities: string` are mandatory.
* Field `syncConfig: boolean` is optional and defaults to true.

next, `entities` has to be an array:

* If the item is type of string it has to point to file or directory if so the file or directory will by backed up.

* If the item is a type of array, the first item of that array is the final file name and the second item is the command which will be run and its stdout will be backed up into this file.

* If the item is a type of object. The `i:string` and `o:string` property are mandatory, `i` is input file / folder, `o` is output name. There could be also `options: object` property defined. Possible options are:
  * `noSymlinks: boolean`, defaults to false
  * `exclude: Array<glob>` defaults to []
  * `include: Array<glob>` defaults to []

```json
{
  "url": "git@github.com:jukben/dotfiles.git",
  "readme": "README.md",
  "syncConfig": false,
  "entities": [
    {
      "i": "~/.config/fish",
      "o": ".config/fish",
      "options": {
        "noSymlinks": true,
        "exclude": ["fishd.dca90476d2cf"]
      }
    },
    {
      "i": "~/Library/Application Support/Code/User/settings.json",
      "o": "vscode/settings.json"
    },
    "~/.tmux.conf",
    "~/.gitignore",
    "~/.vimrc",
    ["brew-cask.txt", "brew cask list"]
  ]
}
```

### List available projects

Run `gbck --list` to see a list of available projects even with information when where lastly updated.

### Backup a project

For back up all project just simply run `gbck`. If you want to back up particular project run e.g. `gbck dotfiles private-dotfiles`

## Contributing

Do you miss something? Open an issue, I'd like to hear more about your use case. You can also fork this repository run `yarn` and send a PR! ❤️

Currently test are missing. 😥 But you can help me to fix this!

## License

The MIT License (MIT) 2018 - Jakub Beneš