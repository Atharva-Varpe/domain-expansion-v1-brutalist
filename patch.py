with open('/app/frontend/src/components/GameUI.tsx', 'r') as f:
    content = f.read()

search = """    socket.on('connect', () => {
      console.log('Connected to socket server');
      setIsConnected(true);
      // Auto-set the generated name when connected
      socket.emit('set_name', randomName);
    });"""

replace = """    if (socket.connected) {
      console.log('Already connected to socket server');
      setIsConnected(true);
      socket.emit('set_name', randomName);
    }

    socket.on('connect', () => {
      console.log('Connected to socket server');
      setIsConnected(true);
      // Auto-set the generated name when connected
      socket.emit('set_name', randomName);
    });"""

new_content = content.replace(search, replace)

with open('/app/frontend/src/components/GameUI.tsx', 'w') as f:
    f.write(new_content)
