# Aspnet Core With Vue.js

I wanted to learn about vue js and use it along with aspnet core application. I am sure there may be solution templates _out there_ for this, but, I still gave it a shot.

Complete setup an be found this [Git Repo](https://github.com/ajaxe/host-mgmt/tree/master/HostingUserMgmt)

## Project Structure

I settled on the following project structure and custom build tasks in vscode code to automate the javascript build.

```
.
+-- appsettings.json
+-- Project.csproj
+-- Program.cs
+-- Startup.cs
+-- Controllers
|   +-- HomeController.cs
|   +-- ValuesController.cs
+-- Views
|   +-- Home
|       +-- Index.cshtml
+-- wwwroot
|   +-- (built vue js files)
|   +-- favicon.ico
+-- VueApp
|   +-- (vue app files/folders)
|   +-- pacakge.json
```

## Vscode Tasks

To facilitate building of vue javascript files along with launching of aspnet core application in vscode I created the following tasks:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "build-vue-app",
            "command": "parcel",
            "type": "shell",
            "args": [
                "build",
                "${workspaceFolder}/VueApp/App/index.ts",
                "-d",
                "${workspaceFolder}/wwwroot/"
            ]
        },
        {
            "label": "build-dotnet",
            "command": "dotnet",
            "type": "process",
            "args": [
                "build",
                "${workspaceFolder}/Project.csproj"
            ],
            "problemMatcher": "$msCompile"
        }, {
            "label": "build",
            "dependsOn": ["build-vue-app", "build-dotnet"]
        }
    ]
}
```

In above configuration, task `build` is dependent on tasks `build-vue-app` and `build-dotnet`.

## Vue.js Build

I am using [Parceljs](https://parceljs.org/) to build and transpile the javascript code. The task `build-vue-app` (in previous section), outputs built javscript files in `/wwwroot` folder which is the default WebRoot for aspnet core application.

Razor view `Views/Home/Index.cshtml` is used to serve the assets in `wwwroot`.
