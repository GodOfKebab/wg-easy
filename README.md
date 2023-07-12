# WireGuard Enhanced

[//]: # ([![Build & Publish Docker Image to Docker Hub]&#40;https://github.com/WeeJeWel/wg-easy/actions/workflows/deploy.yml/badge.svg?branch=production&#41;]&#40;https://github.com/WeeJeWel/wg-easy/actions/workflows/deploy.yml&#41;)

[//]: # ([![Lint]&#40;https://github.com/WeeJeWel/wg-easy/actions/workflows/lint.yml/badge.svg?branch=master&#41;]&#40;https://github.com/WeeJeWel/wg-easy/actions/workflows/lint.yml&#41;)

[//]: # ([![Docker]&#40;https://img.shields.io/docker/v/weejewel/wg-easy/latest&#41;]&#40;https://hub.docker.com/r/weejewel/wg-easy&#41;)

[//]: # ([![Docker]&#40;https://img.shields.io/docker/pulls/weejewel/wg-easy.svg&#41;]&#40;https://hub.docker.com/r/weejewel/wg-easy&#41;)

[//]: # ([![Sponsor]&#40;https://img.shields.io/github/sponsors/weejewel&#41;]&#40;https://github.com/sponsors/WeeJeWel&#41;)

### This is a fork of the [wg-easy](https://github.com/WeeJeWel/wg-easy) project by [Emile Nijseen](https://emilenijssen.nl/?ref=wg-easy). 

You have found the easiest way to install & manage WireGuard on any Linux host!
Instead of displaying a server/client relationship, this fork enables the creation of multi-peer networks.
Currently, there are two types of peers:
* Static Peers with well-known endpoints
* Roaming Peers with non-static endpoints and/or behind a NAT.

<table>
 <tr>
  <td rowspan="3">
    <img src="./assets/home-page.png" width="500"/>
  </td>
  <td>
    <img src="./assets/1.png" width="270" />
  </td>
 </tr>
 <tr>
  <td>
    <img src="./assets/2.png" width="270" />
  </td>
 </tr>
 <tr>
  <td>
    <img src="./assets/3.png" width="270" />
  </td>
 </tr>
</table>

## Features

* All-in-one: WireGuard + Web UI.
* Easy installation, simple to use.
* List, create, edit, delete peers.
* Enable and disable connections.
* Regenerate public, private, and pre-shared keys.
* Set PersistentKeepalive by connection.
* Configure DNS and MTU fields for each peer.
* Configure PreUp, PostUp, PreDown, PostDown scripts for each peer.
* Create networks with multiple static peers.
* Show a client's QR code.
* Download a client's configuration file.
* Statistics for which clients are connected.
* Tx/Rx charts for each connected client.
* Gravatar support.
* An interactive network map.
* Status indicator for the web server and a toggle for the WireGuard interface.


## Requirements

* A host with a kernel that supports WireGuard (all modern kernels).
* A host with Docker installed.

## Installation

### 1. Install Docker

If you haven't installed Docker yet, install it by running:

```bash
$ curl -sSL https://get.docker.com | sh
$ sudo usermod -aG docker $(whoami)
$ exit
```

And log in again.

### 2. Run WireGuard Easy

To automatically install & run wg-easy, simply run:

<pre>
$ docker run -d \
  --name=wg-easy \
  -e WG_HOST=<b>🚨YOUR_SERVER_IP</b> \
  -e PASSWORD=<b>🚨YOUR_ADMIN_PASSWORD</b> \
  -v ~/.wg-easy:/etc/wireguard \
  -p 51820:51820/udp \
  -p 51821:51821/tcp \
  --cap-add=NET_ADMIN \
  --cap-add=SYS_MODULE \
  --sysctl="net.ipv4.conf.all.src_valid_mark=1" \
  --sysctl="net.ipv4.ip_forward=1" \
  --restart unless-stopped \
  weejewel/wg-easy
</pre>

> 💡 Replace `YOUR_SERVER_IP` with your WAN IP, or a Dynamic DNS hostname.
> 
> 💡 Replace `YOUR_ADMIN_PASSWORD` with a password to log in on the Web UI.

The Web UI will now be available on `http://0.0.0.0:51821`.

> 💡 Your configuration files will be saved in `~/.wg-easy`

### 3. Sponsor

Are you enjoying this project? [Buy Emile a beer!](https://github.com/sponsors/WeeJeWel) 🍻

## Options

These options can be configured by setting environment variables using `-e KEY="VALUE"` in the `docker run` command.

| Env                               | Default           | Example             | Description                                                                                                               |
|-----------------------------------|-------------------|---------------------|---------------------------------------------------------------------------------------------------------------------------|
| `PORT`                            | `51820`           | `12345`             | The internal HTTP port of your VPN management console. Web UI will listen on `51821` inside the Docker container.         |
| `PASSWORD`                        | -                 | `foobar123`         | When set, requires a password when logging in to the Web UI.                                                              |
| `WG_HOST`                         | -                 | `vpn.myserver.com`  | The public hostname of your VPN server.                                                                                   |
| `WG_PORT`                         | `51820`           | `12345`             | The public and internal UDP port of your VPN server. WireGuard will listen on this (`51820`) inside the Docker container. |
| `WG_DEFAULT_DNS`                  | `1.1.1.1`         | `8.8.8.8, 8.8.4.4`  | DNS server clients will use.                                                                                              |
| `WG_DEFAULT_MTU`                  | `null`            | `1420`              | The MTU the clients will use. Server uses default WG MTU.                                                                 |
| `WG_DEFAULT_PERSISTENT_KEEPALIVE` | `0`               | `25`                | Value in seconds to keep the "connection" open.                                                                           |
| `WG_SUBNET`                       | `10.8.0.0/24`     | `10.6.0.0/16`       | Clients IP address range.                                                                                                 |
| `NETWORK_INTERFACE`               | `eth0`            | `eth1`              | Host's public network interface.                                                                                          |
| `WG_INTERFACE`                    | `wg0`             | `utun3`             | Host's WireGuard network interface.                                                                                       |
| `WG_PATH`                         | `/etc/wireguard/` | `~/.wireguard/test` | WireGuard config folder path for wg-quick.                                                                                |
| `WG_PREAMBLE_EXPIRATON`           | `30000`           | `60000`             | When creating a new peer, reserve an IP address for this long (in ms).                                                    |
| `WG_PRE_UP`                       | `...`             | `iptables ...`      | See [config.js](./src/config.js) for the default value. Executed by the host.                                             |
| `WG_PRE_DOWN`                     | `...`             | `iptables ...`      | See [config.js](./src/config.js) for the default value. Executed by the host.                                             |
| `WG_POST_UP`                      | `...`             | `iptables ...`      | See [config.js](./src/config.js) for the default value. Executed by the host.                                             |
| `WG_POST_DOWN`                    | `...`             | `iptables ...`      | See [config.js](./src/config.js) for the default value. Executed by the host.                                             |
| `WG_DEFAULT_PRE_UP`               | `...`             | `iptables ...`      | See [config.js](./src/config.js) for the default value. Executed by the client.                                           |
| `WG_DEFAULT_PRE_DOWN`             | `...`             | `iptables ...`      | See [config.js](./src/config.js) for the default value. Executed by the client.                                           |
| `WG_DEFAULT_POST_UP`              | `...`             | `iptables ...`      | See [config.js](./src/config.js) for the default value. Executed by the client.                                           |
| `WG_DEFAULT_POST_DOWN`            | `...`             | `iptables ...`      | See [config.js](./src/config.js) for the default value. Executed by the client.                                           |

> If you change `PORT` or `WG_PORT`, make sure to also change the exposed port(s).

# Updating

To update to the latest version, simply run:

```bash
docker stop wg-easy
docker rm wg-easy
docker pull weejewel/wg-easy
```

And then run the `docker run -d \ ...` command above again.