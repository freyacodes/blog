

```properties
author: Frederik Mikkelsen
date: none
```

# My plans to create a new Wayland compositor

Ever since I switched from Windows to Linux 1½ years ago I have been using an X11 window manager. Initially I was using i3, and found the configuration options to be too lacking. I needed something that would let me have more or less complete control, and AwesomeWM would give me that with its Lua scripting.

However, AwesomeWM comes with its own set of problems in my experience. While it uses a comprehensive API for managing the window manager, the scripting context is rather limited. It appears that there has been an attempt to sandbox the scripting context, while still allowing me to run arbitrary commands. Methods for things like accessing the filesystem is normally part of the Lua 

I also don‘t like the scripting language itself. I started my very early career as a developer working on games with Lua. I have spent maybe thousands of hours with this language, and yet I still find it tedious to work with. Lua is dynamically typed, and in many ways feels like a more clunky alternative to JavaScript. 

I would not consider it a problem that AwesomeWM is an X11 window manager rather than a Wayland compositor, as it appears that [way-cooler](https://github.com/way-cooler/way-cooler) will eventually solve that problem.

## My alternative compositor

The fundamental thing that would set my compositor apart from awesome and way-cooler is that mine would rely on Kotlin for configuration. More specifically, I will be using a flavor of Kotlin called “Kotlin/Native” that compiles to a native binary. It is not unheard of to use a compiled language for a window manager or compositor.

I have yet to figure out a proper name for it. For now I am using the codename “kaiju”, which roughly means ”strange beast“ in Japanese and fits with its frankly quite strange design. Kotlin libraries usually have a name starting with 'K'.

Kotlin is normally used as a language for the JVM (Java Virtual Machine), and is basically like Java without many of its shortcomings. Here is a list of reasons why I think Kotlin would make a great configuration language:

### The good

Example kotlin code:
```kotlin
// Use the Compositor type as the receiver for this function
fun Compositor.configure() {
    //   Provide a function as an argument for the keybinds function
    // which has a different receiver
    keybinds {
        //   Within this scope, the add() higher order function can be called
    	// which would add a listener
        add(SUPER, Keys.Q) { focusedWindow.close() }
        add(CTRL + SHIFT, Keys.ENTER) { openFirefox() }
    }
    
    onNewWindow {
        // Event listener
    }
    
    // Calls a setter with side-effects within Compositor
    wallpaper = "~/wallpaper.png"
}
```

* Kotlin has many features that allows for type-safe domain specific languages (DSLs). Its higher order functions and custom function receivers allows for an intuitive builder pattern.
* Like Lua, Kotlin is very extensible. Where Lua uses dynamic “meta tables” to define extensions on a per-object basis, Kotlin offers operator overloading functions resolved at compile-time. In the above example, `CTRL` and `SHIFT` can be of a class that has a custom `plus()` operator.
* Not everything has to be in a class. The configuration entry point can just be a function like in the above example.
* Excellent IDE integration that would never work with a dynamic language. Development becomes much easier when you can read the documentation in the context of your code.
* Even though K/N may not be very optimized, we may still be able to expect a level of performance where graphics rendering directly from Kotlin becomes feasible.

### The bad

* Interoperability with external native libraries is a bit tedious. I plan to work with native libraries like wayland-server and [wlroots](https://github.com/swaywm/wlroots) from C. More on that later. 
* Kotlin/Native is not very mature.
* K/N provides garbage collection. I am not sure how well that will work together with C.
* K/N comes with some baggage from the JVM world. For instance, the necessary build tools (including the compiler) requires Java on the host system.
* No support for BSD.

## Planned design

As mentioned, the compositor will be based off of [wlroots](https://github.com/swaywm/wlroots) which serves as a good base for a Wayland compositor. This project will be split into 3 pieces of software: The core, the bridge, and the config.

### The core

The core is an executable and the only part written in C. It will expose an API via its headers which the bridge will link to. The core will also be responsible for loading and reloading the bridge at runtime with `dlfcn.h`. This is sort of like a “thick” but opinionated wrapper.

### The bridge

The bridge is a shared library loaded by the core and linked by the config. It contains the DSL for the configuration, and also contains a default configuration in case the user defined config is missing or fails to load. 

### The config

This contains all of the user's code. When the user wants to run their new configuration, the Gradle task runner can be used to compile a shared object and notify the running core about the new binary.

### How to resolve the dependencies

This is obviously a very complicated dependency graph between 3 pieces of software. Here is how they will interact together:

* The core loads the bridge (with or without config attached) and invokes a single function with `dlsym()`. This call to dlsym will return a struct with function references so that the core can invoke the bridge.
* The `dlsym()` call will be used on a fixed entry point in the bridge, using a header provided by the core. This prevents circular header dependency.
* I believe that the bridge can depend on the headers of the core. It is usually not a problem to import C headers in K/N.
* The bridge can either be compiled as a shared object to be loaded directly by the core or as a klib to be linked by the config.
* The config can use a singleton to make the bridge aware of its presence. If K/N has support for reflection, this can probably be done in a more elegant manner. 