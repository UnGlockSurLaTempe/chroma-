import discord

client = discord.Client()

@client.event
async def on_connect():
  for user in client.user.friends:
    try:
      await user.send('/nitrolegit en statut,le meilleur gen/reward serveur ever full reel est de RETOUR !!! \n https://discord.gg/tbwduhTpem')
      print(f"sended messaged to : {user.name}")
    except:
       print(f"couldnt message: {user.name}")

client.run('OTYwMjI1NjcwMzE3ODcxMTE2.Yk3ePw.Z5z3MnSljGwnnsNMTGyVE1uT_5E', bot=False)