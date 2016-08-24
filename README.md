# Adam 亚当，一切之源

## 简介

支持模板管理的项目初始化工具。

### 安装 adam

`npm install -g adam-cli`

### 模板管理

+ `adam` 不单独维护模板，任何用户可以将自己常用的模板上传到 git 中，然后通过 adam 基于模板做项目初始化，并可自动填入需要的信息。

### 添加模板

+ 通过命令 `adam tpl add <template-name> <template-git-repo-url>` 添加模板。
+ 详细命令介绍可参考 [API.md](API.md)。

### 项目初始化

+ 添加模板后，就可以通过 `adam` （不加任何参数）基于已添加的模板初始化项目。

### 贡献模板

+ 你只需要按照项目实际情况，创建初始化的目录及项目文件，**推荐将项目文件放在 template 目录下**。
+ 你可以将模板放在任何可以用 `git` 命令下载到的地址。
+ `adam` 在初始化项目时，会使用当前项目真实信息替换某些变量，可参考 [API Variables](API.md#variables)。
+ **注意**：git 是不支持空目录的，所以如果你希望项目在初始化时拥有一些空目录，可选择以下两种方式处理：
    - 在初始化空目录中，添加 `.gitkeep` （或 `.keep`, `.keeper`, `.gitkeeper`） 文件，本工具会在初始化时将该文件移除。
    - 把创建空目录的工作交给 `npm scripts`、`gulp`、`grunt` 等脚手架工具。

## 使用方法

详细使用方法可参考 [API.md](API.md)。

## Changelog

详见 [CHANGELOG.md](CHANGELOG.md)。
