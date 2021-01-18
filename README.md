## DEMO

[link](https://kreiadesign.com/)

## Authors

* **Anatoly Strashkevich**

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details


## Janus-Gateway
```bash
docker run -it \
    --cap-add=NET_ADMIN \
    --name janus-gw \
    -p 20000-20100:20000-20100/udp \
    -p 8088:8088 \
    -p 8188:8188 \
    -p 7188:7188 \
    -e ID="70c18290-5712-11eb-9f05-551b212e3e34" \
    -e ADMIN_KEY="70c18291-5712-11eb-9f05-551b212e3e34"\
    -e SERVER_NAME="instance_0"\
    -e WS_PORT="8188"\
    -e ADMIN_WS_PORT="7188" \
    -e LOG_PREFIX="instance_0:" \
    -e DOCKER_IP="127.0.0.1"\
    -e DEBUG_LEVEL="5" \
    -e NAT_1_1_MAPPING="127.0.0.1" \
    -e RTP_PORT_RANGE="20000-20100" \
    -e STUN_SERVER="stun.voip.eutelia.it"\
    -e STUN_PORT="3478" \
    herbert1947/janus-gateway-videoroom
```