import paho.mqtt.client as mqtt
import json

BROKER = "broker.emqx.io"
PORT = 1883
PLUGIN_TOPIC = "termos/system/plugins"
RESPONSE_TOPIC = "termos/v3/lobby"

def on_connect(client, userdata, flags, rc):
    print("Connected with result code", rc)
    client.subscribe(PLUGIN_TOPIC)

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        print("Received:", data)
        if data.get("cmd") == "run" and data.get("script") == "autogreeter":
            user = data.get("user", "unknown")
            response = {
                "id": "SYSTEM",
                "msg": f"Plugin executed: Welcome {user}",
                "type": "system"
            }
            client.publish(RESPONSE_TOPIC, json.dumps(response))
    except Exception as e:
        print("Error:", e)

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

client.connect(BROKER, PORT, 60)
client.loop_forever()
