```properties
author: Frederik Mikkelsen
draft: true
date: 2019-10-16T13:30:49.251Z
```

# How to make Lavalink balance its requests over many IPv6 addresses

This brief tutorial explains how to set Lavalink to use many random IPv6 addresses to avoid ratelimiting and IP blocks. This is all cutting-edge, and I encourage you to yell at me in despair if this doesn't work.

## Prerequisites

* A Ubuntu-like server, I guess? I have no idea how interface management works on anything that is not Ubuntu 18.04.
* A large block of IP addresses kindly handed down to you by your local neighborhood network admin. At the very least a /63.
* Lavalink from the `experimental/fix-429` branch. 

## A note about IPv6 block size

Lavalink (and the general internet) uses individual /64 blocks to connect to execute HTTP requests. If you have a /64 block you technically have $2^{64}$ IP addresses, with only one of them usable. If one gets ratelimited, they all do. This is not useful for us.

Let $m$ be your mask length. You could use this formula to calculate the actual number of IPs you can use:

$$
2^{64-m}
$$

How many you need is up to you to determine.

## Assigning your IPs to your network interface

So now that you have your IPs, you will need to add them to the interface. Linux needs to know which IPs it can use where.

You need to know which block you have been assigned, which IP belongs to the gateway, and what subnet you are on. You also need to figure out which network interface you need to use.

For the sake of this tutorial, we will be using the following:

IPv6 block: `beef:beef:beef:b200::/56`

Subnet: `beef:beef:beef:b200::/56`

Gateway: `beef:beef:beef:b200::1`

Interface: `eno2`

On Ubuntu the configuration for the network interfaces is at `/etc/network/interfaces`. It might be an advantage to write your long config to `/etc/network/interfaces.d/myconfig` or something, as that way you can simply replace it.

```bash
iface eno2 inet6 static
  gateway beef:beef:beef:b200::1
  address beef:beef:beef:b201:: 
  netmask 56
iface eno2 inet6 static
  address beef:beef:beef:b202:: 
  netmask 56
iface eno2 inet6 static
  address beef:beef:beef:b203:: 
  netmask 56
## ... repeat until beef:beef:beef:b2ff::
```

Notice how we don't add `beef:beef:beef:b200::` to our interface as an address. This address belong to the gateway, which is likely on a different machine! We can't use it. All the other IPs listed in the example are added to the interface.

The netmask is the mask of the subnet our IPs belong to. A subnet uses the notation of a CIDR block, but it is not the same as an IPv6 block. The gateway serves as the exit point of the subnet. In our case it just so happens that our entire block is also our entire subnet.

Apply your configuration with `ip addr flush eno2 && ifdown eno2 && ifup eno2`

Verify your setup with the `ifconfig` command. You should see one line for each IP.

### Generating an interface config

Write a small script or something. Make sure you understand IPv6 CIDR notation. I recommend this article:

https://chrisgrundemann.com/index.php/2012/introducing-ipv6-understanding-ipv6-addresses/

## How to configure Lavalink to use IPv6

TODO