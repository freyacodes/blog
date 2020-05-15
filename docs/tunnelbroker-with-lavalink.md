```properties
author: Frederik Mikkelsen
date: 2020-03-24T10:12:22.708Z
updated: 2020-04-12T10:39:36.049Z
```

# Using Tunnelbroker to make Lavalink balance its requests over many IPv6 addresses

When scraping metadata with Lavalink, it may be useful to have a large block of IPv6 addresses available. Allocating a large prefix of addresses to a machine can be difficult, as this is dependent on the configuration of the IP addresses, which is generally out of your control if you are renting a server.

We can use the free Tunnelbroker service from Hurricane Electric to get a routed IPv6 prefix. This can also work if your server does not even have an IPv6 address to begin with. If you intend to use Tunnelbroker, bear in mind that it is a free service and it may break.

## Please read the entire guide

Several weeks later I am still being contacted by people who have trouble with this guide. Most people's problems are fixed by following the troubleshooting guide. I'm still happy to help if you've read this entire guide. 

## Acquiring a /48 block

1. Register an account at https://tunnelbroker.net/
2. Create a new (regular) tunnel
3. Enter your IPv4 IP address and select a nearby region. Your IPv4 must be pingable.
4. Request a new /48. We *could* use a /64, however a /64 is much more likely to be blocked.

## Configuring your block

The first thing you will need to do is enable IPv6 binding in Linux. This enables Lavalink (and other programs) to bind to local addresses that would otherwise be considered illegal:

```bash
# Enable now
sysctl -w net.ipv6.ip_nonlocal_bind=1
# Persist for next boot
echo 'net.ipv6.ip_nonlocal_bind = 1' >> /etc/sysctl.conf
```

Next you will need to configure your network system. This diverges a lot depending on your distribution. Hurricane Electric provides a lot of examples. Common for them all is that you need to take two extra steps:

* Replace the /64 prefix with the /48 one you were allocated. The full CIDR notation, not just the bitmask 48. If your /64 prefix is `2001:470:dead:beef::/64` and your /48 prefix is `2001:470:1234::/48`, then you need to replace `dead:beef` with `1234`.
* You need to somehow make sure the following command is run after your interface is otherwise configured. The block must end with /48:

```bash
ip -6 route replace local YOUR_48_BLOCK dev lo
```



## Test your configuration

Before setting up Lavalink, you can test if your IPv6 configuration actually works.

```bash
# Test that IPv6 works in the first place
ping6 google.com

# If you have the IPv6 block 1234:1234:1234::/48
# You should be able to use any of the IPs within that block
ping6 -I 1234:1234:1234:: google.com
ping6 -I 1234:1234:1234::1 google.com
ping6 -I 1234:1234:1234:dead::beef google.com

# Make sure your /48 block appears when running this command
ip -6 route
```



## How to configure Lavalink to use IPv6 balancing

This is the easy part. Add the ratelimit block to your config:

```yaml
lavalink:
  server:
    # ...
    ratelimit:
      ipBlocks: ["1234:1234:1234::/48"]
      strategy: "LoadBalance"
      searchTriggersFail: true
```

You can read more about the different strategies in [ROUTEPLANNERS.md](https://github.com/Frederikam/Lavalink/blob/master/ROUTEPLANNERS.md)

### When using docker

If you use Docker, you will need to set your network mode to "host". This will let your container use the network as if it was not in a container.



## Troubleshooting

### Ubuntu: Editing `/etc/network/interfaces` on a Netplan system

Don't edit `/etc/network/interfaces` if your system relies on a `/etc/netplan/` configuration. See the Netplan example on the Tunnelbroker website.

### Using the /64 block instead of the /48 block

Make sure the /64 block is not being used in your config. You must replace it in the examples that Tunnelbroker provides.

### Lavalink: Connect timed out

You probably haven't configured your routes properly. See the “Test your configuration” section.

### Lavalink: Cannot assign requested address (Bind failed)

You did not enable `net.ipv6.ip_nonlocal_bind` as described above.

### Lavalink: Index out of bounds for the CombinedBlock
You're using a nano strategy for a block larger than a /64 block. This doesn't work. The other strategies still pick out random values for the last 64 bits, so there would be no point anywaysIndex out of bounds for the CombinedBlock.

### Lavalink: Could not look up AAAA record for host. Falling back to unbalanced IPv4.

You're running Lavalink in a docker container without [`host` as your network mode](https://docs.docker.com/network/host/). 

If that isn't it, check your DNS config. Your DNS server is not returning IPv6 records for whatever reason.

### “Help, I've tried everything!”

If you've followed this entire guide and you have a problem not listed here, you are welcome to contact me. Please provide the following info:

* Which distro you are on
* The network config you wrote based on one of the Tunnelbroker examples
* A screenshot of the Tunnelbroker website with your tunnel details
* The output of `ip -6 route`
* Don't say “doesn't work”. Describe your problem in details

And please don't censor your IPs. It makes it harder for me to help, and I won't attack you.
