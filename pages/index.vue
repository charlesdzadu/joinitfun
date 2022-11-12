<template>
  <div>
    <h1>Welcome to Video join it and funit!</h1>
    <div id="buttons">
      <button id="cameraBtn" @click="requestMediaAccess">

        <span class="mdc-button__label">Ouvrir caméra et micro</span>
      </button>
      <button id="createBtn">

        <span class="mdc-button__label" @click="createRoom">Créer un chatroom</span>
      </button>
      <button id="joinBtn">

        <span class="mdc-button__label">Rejoindre chatroom</span>
      </button>
      <button id="hangupBtn">

        <span class="mdc-button__label" @click="saveDataToDB">Raccrocher</span>
      </button>
    </div>
    <div>
      <span id="currentRoom"></span>
    </div>
    <div id="videos">
      <video id="localVideo" muted autoplay playsinline :srcObject.prop="local"></video>
      <video id="remoteVideo" autoplay playsinline :srcObject.prop="remote"></video>
    </div>
  </div>
</template>

<script>
import { mapMutations } from 'vuex'
import { db } from '~/plugins/firebase'
import { addDoc, collection } from 'firebase/firestore'

export default {
  name: 'IndexPage',
  computed: {
    local() {
      return this.$store.state.localStream;
    },

    remote() {
      return this.$store.state.remoteStream;
    },

  },

  methods: {
    async saveDataToDB() {
      console.log("what happen", db)

      const docRef = await addDoc(collection(db, "cities"), {
        name: "Tokyo",
        country: "Japan"
      });
      console.log("Document written with ID: ", docRef.id);
    },
    requestMediaAccess() {
      this.$store.dispatch('openUserMedia');
    },

    createRoom() {
      this.$store.dispatch('createRoom');
    },
    ...mapMutations({

    })
  }
}
</script>


<style>
body {
  background: #ECEFF1;
  color: rgba(0, 0, 0, 0.87);
  font-family: Roboto, Helvetica, Arial, sans-serif;
  margin: 0;
  padding: 0;
}


#load {
  color: rgba(0, 0, 0, 0.4);
  text-align: center;
  font-size: 13px;
}

@media (max-width: 600px) {

  body {
    margin-top: 0;
    background: white;
    box-shadow: none;
  }

  body {
    border-top: 16px solid #ffa100;
  }
}

body {
  margin: 1em;
}

button {
  margin: 0.2em 0.1em;
}

div#videos {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

div#videos>video {
  background: black;
  width: 640px;
  height: 100%;
  display: block;
  margin: 1em;
}
</style>