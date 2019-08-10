# Why I don't use orchestration

FredBoat is a large Discord music bot that consists of a bunch of different microservices, some of which are scaled horizontally into many instances. I occasionally get asked if and how I deal with orchestration. **I don't**. This is a personal tale about why I think orchestration is not the right tool for my particular job. Don't take this as direct advice on whether or not to use orchestration.

## A little background

FredBoat is a Discord bot. At my company, I mainly operate two bots: a humongous free version and a small paid bot which is tiny in comparison. The larger bot is the interesting one, as it is the one that actually poses a challenge to manage. It consists of these systemd services:

* 1 FredBoat – a central controlling service
* 6 Sentinels – a sort of cache and gateway
* 6 Lavalink audio nodes – to deliver music
* 1 RabbitMQ – to broker messages between FredBoat and Sentinels
* 1 Quarterdeck – provides REST access to the database
* 1 PostgreSQL – cache and user preferences

The particularly interesting parts are the sentinels and Lavalink nodes. This is where the far majority of my RAM, CPU, and bandwidth needs to go. 

## Why orchestration is not very applicable

I'll admit that there are a lot of single points of failures in my system. FredBoat and Quarterdeck do not scale horizontally. In terms of performance, this is not much of a problem, as they do not need to scale. RabbitMQ and Postgres can be scaled horizontally, but this is again not necessary.

Sentinel and Lavalink are built with horizontal scalability in mind. Lavalink does not depend on other microservices, is subject to seamless load-balancing and -rebalancing, and requires no special configuration. Lavalink could be a great candidate for orchestration.

However, Sentinel is bound by a lot of limitations. Due requirements imposed on me by Discord's API, I can't simply shuffle them around as I please. It comes with a hefty time penalty to restart one of these due to ratelimits, which causes users to experience a partial outage. Each Sentinel is responsible for a set of shards, and they all need to agree on how many shards there are in total. If I wanted to add a 7th Sentinel, I would need to “re-shard” by restarting ALL the sentinels, triggering an outage lasting a few hours.