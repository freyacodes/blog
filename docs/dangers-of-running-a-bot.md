

```properties
author: Frederik Mikkelsen
time: 2019-07-06T23:20:10.342Z
```

# The dangers of running a large Discord bot

This blog post reflects on some of the biggest struggles one might face when working on a large Discord bot, particularly those that play music. Writing about this topic is one of my motivations for starting this blog, partly because it serves as an outlet for my frustrations. At a later date, I might write about some of the countermeasures I have taken to counter some of these problems. However, I am not used to writing a blog and would appreciate any feedback you might have.

A few years ago I created a small open source Discord bot called “FredBoat”, which provided a few utilities and lame jokes to a few hundred “servers” (or guilds if you will). Back then, all bots were using an unofficial reverse-engineered API that regular clients used. In spite of this, there was excellent tooling available even back then. I went with a library called JDA, which I still use today.

Since the API was reverse-engineered, it has never been particularly difficult to develop a small Discord bot. For the most part, you are essentially listening to messages and occasionally reply back. However, something simple like this can quickly become complicated once you add scale. FredBoat introduced a music system and got so popular I couldn't keep up with the architectural enhancements its scale warrants.

A music bot plays music from various sources into voice channels. As of this writing, FredBoat can play to upwards of 4,000 channels in 1.5M guilds, serving 33M unique users. Serving this much music is the relatively easy part, as most audio is already in the same 20ms Opus format that Discord uses. The more difficult part is the handling of Discord's millions of entities and events, which occupies a large amount of memory.

## Gateway connections are fragile

As of this writing, FredBoat maintains 1248 WebSocket connections from different servers to Discord. We call them shards. These sockets receive up to around 10,000 incoming events per second. Each shard has a fraction of the guilds assigned to them, meaning if one goes down the bot will appear offline in some guilds. Given that this is over the internet, this is inevitably going to happen. As I was writing this two-fifths went down due to yet another global Cloudflare outage.

There are some serious problems with outages like this, as recreating these connections is severely rate-limited. All bots are subject to a 5 second backoff period after authenticating a connection. In theory that means that if these connections are severed, it in theory takes 6235 seconds (104 minutes) to fully recover. In practice, this duration is longer. This is somewhat rare, but one recent week was particularly frustrating:

| Time (CEST)     | Cause                                                        |
| --------------- | ------------------------------------------------------------ |
| June 22nd 12:20 | Planned router maintenance of my host‘s routers              |
| June 24th 14:00 | Verizon BGP screwup caused Cloudflare to go down             |
| June 28th 7:50  | My host‘s redundant core routers stop working due to a firmware problem |
| June 28th 23:10 | Cloudflare BGP screwup causing port flapping (twice)         |
| June 29th 2:30  | Discord token reset                                          |

These incidents are mostly out of my control. In spite of these outages, my host‘s network is usually relatively robust.

Then there‘s the Discord token reset. Discord also has a daily rate-limit for gateway connections, which is about 1000 for most bots or around 333/guild for some select large bots such as mine. This exists to prevent bots stuck in a login loop from causing load on the API, but in practice, it only makes a string of outages even worse.

## Discord was not designed for music bots

Discord has a global network of servers all over the globe to serve as voice servers. For each voice session we use a WebSocket and a UDP socket. All audio is delivered over a UDP socket to the voice server. Discord was not designed for playing music over, and so it is prone to dropping audio frames. Frames sent via UDP are not resent if they get dropped along the way. This problem also appears on the receiver's side, as they also have a UDP connection to the voice server. These dropped frames manifest themselves as stuttering.

Another cause of stuttering is when the voice server itself is misbehaving, where users are forced to manually change their voice region (and thus voice server). Most users don't realise this and blame the music bot for not working properly.

## Being at the mercy of giants

Discord music bots use a lot of unofficial APIs from streaming services. These are conveniently abstracted away in a library called [Lavaplayer](https://github.com/sedmelluq/lavaplayer), which is similar to [youtube-dl](https://ytdl-org.github.io/youtube-dl/index.html). This means that we occasionally need to restart our bot with an updated Lavaplayer version when something on YouTube, Soundcloud, etc changes without warning. For some, this means disconnecting all shards (gradually or all at once), however, FredBoat solves that with a complicated architectural design.