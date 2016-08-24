# Adam APIs

## Version 版本

通过 `adam -v` 查看当前版本

## Clean 清理

可以通过执行 `adam clean` 删掉 adam 缓存（`~/.adam/`）。

## Config 配置

配置 adam 只需执行命令 `adam config` ，按照提示填入相应信息即可。
配置动作并非必须，但如果不希望每次添加 adam 模板时输入长长的 git 地址，强烈建议执行配置。

*adam config 会询问的项*

1. Default gitlab group URL
2. Gitlab/Github private token

## Template 模板管理

### add 添加模板

+ 普通方式：`adam tpl add <template-name> <template-git-repo-url>`
+ 文艺方式1：添加 github 上已有的库，可省略域名等信息，如 `git@github.com:my-name/my-tpl` 可直接使用 `adam add my-name/my-tpl`
+ 文艺方式2：如果已经通过 `adam config` 配置了默认 gitlab 仓库组，则可以只写 `adam tpl add <template-git-repo-name>`
+ 快捷方式：二级命令 `tpl` 可省略：`adam add ...`

### rename 重命名模板

+ 普通方式：`adam tpl rename <old-template-name> <new-template-name>`
+ 快捷方式：二级命令 `tpl` 可省略：`adam rename ...`

### remove 删除模板

+ 普通方式：`adam tpl remove <template-name>`
+ 快捷方式：二级命令 `tpl` 可省略：`adam remove ...`

### update 升级模板

+ 升级指定模板：`adam tpl update <template-name>`
+ 升级所有本地模板：`adam tpl update -a`
+ 快捷方式：二级命令 `tpl` 可省略：`adam update ...`

### list 查询模板

+ 查询本地模板：`adam tpl list`
+ 查询本地模板（带repo地址）：`adam tpl list -v`
+ 查询远程模板：如果已经通过 `adam config` 配置了默认 gitlab 仓库组，则可以通过 `adam tpl list -a` 查询所有远程仓库组中的项目
+ 快捷方式：二级命令 `tpl` 可省略：`adam list ...`

## Init 初始化项目

不加任何参数，直接执行 `adam` 即可。

*adam 会询问的项*

1. Choose a template
2. Project name
3. Project branch/tag/hash
4. Git user or project author
5. User email

## Variables 变量

与初始化项目时询问的项相对应，可用于替换的变量包括：

+ `{{ template }}`: template name
+ `{{ project }}`: project name
+ `{{ branch }}`: project branch/tag/hash
+ `{{ user }}`: user name
+ `{{ email }}`: user email address

**注意**：`{{ foo }}` 中大括号与变量间的空格非必需。

## Help 获取帮助

+ 普通方式：`adam help`
+ 文艺方式：`adam help tpl`, `adam help tpl list`
