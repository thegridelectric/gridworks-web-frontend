import { defineMock } from 'vite-plugin-mock-dev-server'

export default defineMock({
	url: '/ws/snapshot',
	ws: true,
	setup(wss) {
		// Listen for connection events
		wss.on('connection', (ws, req) => {
			console.log('Client connected:', req.url)


			function sendStatus() {
				ws.send(JSON.stringify({
					type: 'status',
					target_gnode: 'hw1.isone.me.versant.keene.beech.scada',
					thermostat_names: ['a', 'b'],
					relays: {
						// We don't need this anymore
						// relay1: {
						// 	display_name: 'Mainfloor Zone 1 Failsf',
						// 	state: 'energized'
						// },
						// relay2: {
						// 	display_name: 'Mainfloor Zone Scada Ops',
						// 	state: 'energized',
						// }

						// These are the only relays that matter for the UI
						relay3: {
							// Are we charging the store?
							state: 'non'
						},
						relay5: {
							state: 'energized'
						},
						relay6: {
							state: 'energized'
						},
						relay9: {
							state: 'energized'
						},
					}
				}));
			}
			setTimeout(sendStatus, 1000);

			function sendSnapshot() {
				ws.send(JSON.stringify({
					'type': 'mqtt_message',
					'message_type': 'snapshot.spaceheat',
					'payload': {
						'SnapshotTimeUnixMs': Date.now() * 1000 - 5000,
						LatestReadingList: [
							{ ChannelName: 'primary-flow', Value: 200 },
							{ ChannelName: 'primary-pump-pwr', Value: 35 },
							{ ChannelName: 'dist-flow', Value: 300 },
							{ ChannelName: 'dist-pump-pwr', Value: 45 },
							{ ChannelName: 'store-flow', Value: 5 },
							{ ChannelName: 'store-pump-pwr', Value: 10 },
							{ ChannelName: 'hp-odu-pwr', Value: 0 },
							{ ChannelName: 'hp-idu-pwr', Value: 1200 },
							{ ChannelName: 'zone1-a-temp', Value: 65000 },
							{ ChannelName: 'zone1-a-set', Value: 67000 },
							{ ChannelName: 'zone1-a-state', Value: 1 },
							{ ChannelName: 'zone2-b-temp', Value: 67000 },
							{ ChannelName: 'zone2-b-set', Value: 67000 },
							{ ChannelName: 'zone2-b-state', Value: 0 },

							// Depth channels (buffer-depth*, tank*-depth*) are Fahrenheit × 100.
							{ ChannelName: 'buffer-depth1', Value: 14000 },
							{ ChannelName: 'buffer-depth2', Value: 12000 },
							{ ChannelName: 'buffer-depth3', Value: 10000 },
							{ ChannelName: 'tank1-depth1', Value: 12000 },
							{ ChannelName: 'tank1-depth2', Value: 11000 },
							{ ChannelName: 'tank1-depth3', Value: 10000 },
							{ ChannelName: 'tank2-depth1', Value: 16000 },
							{ ChannelName: 'tank2-depth2', Value: 14000 },
							{ ChannelName: 'tank2-depth3', Value: 13000 },
							{ ChannelName: 'tank3-depth1', Value: 18000 },
							{ ChannelName: 'tank3-depth2', Value: 17000 },
							{ ChannelName: 'tank3-depth3', Value: 16000 },

							{ ChannelName: 'store-hot-pipe', Value: 60000 },
							{ ChannelName: 'store-cold-pipe', Value: 60000 },
							{ ChannelName: 'hp-lwt', Value: 70000 },
							{ ChannelName: 'hp-ewt', Value: 60000 },
							{ ChannelName: 'dist-swt', Value: 60000 },
							{ ChannelName: 'dist-rwt', Value: 60000 },
							{ ChannelName: 'buffer-cold-pipe', Value: 60000 },
							{ ChannelName: 'buffer-cold-pipe', Value: 60000 },
						]
					},
				}))
				setTimeout(sendSnapshot, 1000);
			}
			setTimeout(sendSnapshot, 2000);

			// Listen for messages
			ws.on('message', (data) => {
				const message = JSON.parse(data.toString())
				console.log('Received:', message)

				// Broadcast to all clients
				wss.clients.forEach((client) => {
					if (client.readyState === 1) {
						client.send(JSON.stringify({
							type: 'message',
							data: message
						}))
					}
				})
			})

			// Listen for close
			ws.on('close', () => {
				console.log('Client disconnected')
			})
		})
	}
})