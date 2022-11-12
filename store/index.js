import { db } from '~/plugins/firebase.js'
import { collection, doc, setDoc, addDoc } from "firebase/firestore"


const configuration = {
    iceServers: [
        {
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ],
        },
    ],
    iceCandidatePoolSize: 10,
};





export const state = () => ({
    peerConnection: null,
    localStream: "charles",
    remoteStream: null,
    roomDialog: null,
    roomId: null,
})



export const getters = {

}



export const mutations = {
    updateLocalStream(state, stream) {
        state.localStream = stream;
    },

    updateRemoteStream(state, stream) {
        state.remoteStream = stream;
    },

    updatePeerConnection(state, peerConn) {
        state.peerConnection = peerConn;

    },


    registerPeerConnectionListeners(state) {
        state.peerConnection.addEventListener('icegatheringstatechange', () => {
            console.log(
                `ICE gathering state changed: ${state.peerConnection.iceGatheringState}`);
        });

        state.peerConnection.addEventListener('connectionstatechange', () => {
            console.log(`Connection state change: ${state.peerConnection.connectionState}`);
        });

        state.peerConnection.addEventListener('signalingstatechange', () => {
            console.log(`Signaling state change: ${state.peerConnection.signalingState}`);
        });

        state.peerConnection.addEventListener('iceconnectionstatechange ', () => {
            console.log(
                `ICE connection state change: ${state.peerConnection.iceConnectionState}`);
        });
    }
}




export const actions = {

    async openUserMedia({ commit }) {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        })
        let emptyStream = new MediaStream()
        commit('updateLocalStream', stream)
        commit('updateRemoteStream', emptyStream)

    },

    async createRoom({ commit, state }) {

        


        console.log('Create PeerConnection with configuration: ', configuration);


        commit('updatePeerConnection', new RTCPeerConnection(configuration))
        commit('registerPeerConnectionListeners')

        state.localStream.getTracks().forEach(track => {
            state.peerConnection.addTrack(track, state.localStream);
        });


        // Code for collecting ICE candidates below
        //TODO enregistrer dans firestore caller candidate
        // const callerCandidatesCollection = roomRef.collection('callerCandidates');
        state.peerConnection.addEventListener('icecandidate', event => {
            if (!event.candidate) {
                console.log('Got final candidate!');
                return;
            }
            console.log('Got candidate: ', event.candidate);
            // callerCandidatesCollection.add(event.candidate.toJSON());
        });


        // Code for creating a room below
        const offer = await state.peerConnection.createOffer();
        await state.peerConnection.setLocalDescription(offer);
        console.log('Created offer:', offer);
        const roomWithOffer = {
            'offer': {
                type: offer.type,
                sdp: offer.sdp,
            },
        };
        try {
            console.log("room ref  création d'offre", roomWithOffer)

            addDoc(collection(db, "rooms"), roomWithOffer).then((data) => {
                console.log("what happens")
                console.log("la donner ", data)
            })


        } catch (error) {
            console.log("il ya une error", error)

        }
        state.roomId = roomRef.id;
        console.log(`New room created with SDP offer. Room ID: ${roomRef.id}`);


        //Ecouter le track sur la connexion
        state.peerConnection.addEventListener('track', event => {
            console.log('Got remote track:', event.streams[0]);
            event.streams[0].getTracks().forEach(track => {
                console.log('Add a track to the remoteStream:', track);
                state.remoteStream.addTrack(track);
            });
        });


        // Ecouter les données dans Firebase pour voir si quelqu'un répond à l'appel
        roomRef.onSnapshot(async snapshot => {
            const data = snapshot.data();
            if (!state.peerConnection.currentRemoteDescription && data && data.answer) {
                console.log('Got remote description: ', data.answer);
                const rtcSessionDescription = new RTCSessionDescription(data.answer);
                await state.peerConnection.setRemoteDescription(rtcSessionDescription);
            }
        });


        // Ecouter la collection sur calle Candidate
        roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added') {
                    let data = change.doc.data();
                    console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                    await state.peerConnection.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });


    },

    async joinRoomById({ state }) {
        let enterRoomId = "";
        const db = firebase.firestore();
        const roomRef = db.collection('rooms').doc(`${enterRoomId}`);
        const roomSnapshot = await roomRef.get();
        console.log('Got room:', roomSnapshot.exists);

        if (roomSnapshot.exists) {
            console.log('Create PeerConnection with configuration: ', configuration);
            state.peerConnection = new RTCPeerConnection(configuration);
            registerPeerConnectionListeners();
            state.localStream.getTracks().forEach(track => {
                state.peerConnection.addTrack(track, localStream);
            });


            // Code for collecting ICE candidates below
            const calleeCandidatesCollection = roomRef.collection('calleeCandidates');
            state.peerConnection.addEventListener('icecandidate', event => {
                if (!event.candidate) {
                    console.log('Got final candidate!');
                    return;
                }
                console.log('Got candidate: ', event.candidate);
                calleeCandidatesCollection.add(event.candidate.toJSON());
            });



            state.peerConnection.addEventListener('track', event => {
                console.log('Got remote track:', event.streams[0]);
                event.streams[0].getTracks().forEach(track => {
                    console.log('Add a track to the remoteStream:', track);
                    state.remoteStream.addTrack(track);
                });
            });


            // Code for creating SDP answer below
            const offer = roomSnapshot.data().offer;
            console.log('Got offer:', offer);
            await state.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await state.peerConnection.createAnswer();
            console.log('Created answer:', answer);
            await state.peerConnection.setLocalDescription(answer);

            const roomWithAnswer = {
                answer: {
                    type: answer.type,
                    sdp: answer.sdp,
                },
            };
            await roomRef.update(roomWithAnswer);

            // Listening for remote ICE candidates below
            roomRef.collection('callerCandidates').onSnapshot(snapshot => {
                snapshot.docChanges().forEach(async change => {
                    if (change.type === 'added') {
                        let data = change.doc.data();
                        console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                        await state.peerConnection.addIceCandidate(new RTCIceCandidate(data));
                    }
                });
            });
        }
    },


    async registerPeerConnectionListeners({ state }) {
        state.peerConnection.addEventListener('icegatheringstatechange', () => {
            console.log(
                `ICE gathering state changed: ${state.peerConnection.iceGatheringState}`);
        });

        state.peerConnection.addEventListener('connectionstatechange', () => {
            console.log(`Connection state change: ${state.peerConnection.connectionState}`);
        });

        state.peerConnection.addEventListener('signalingstatechange', () => {
            console.log(`Signaling state change: ${state.peerConnection.signalingState}`);
        });

        state.peerConnection.addEventListener('iceconnectionstatechange ', () => {
            console.log(
                `ICE connection state change: ${state.peerConnection.iceConnectionState}`);
        });
    },


    async hangUp({ state }) {
        state.localStream.getTracks().forEach(track => track.stop())
        if (state.remoteStream) {
            state.remoteStream.getTracks().forEach(track => track.stop())
        }

        if (state.peerConnection) {
            state.peerConnection.close()
        }

        state.localStream = null;
        state.remoteStream = null;

        if (state.roomId) {
            const db = firebase.firestore();
            const roomRef = db.collection('rooms').doc(roomId);
            const calleeCandidates = await roomRef.collection('calleeCandidates').get();
            calleeCandidates.forEach(async candidate => {
                await candidate.ref.delete();
            });

            const callerCandidates = await roomRef.collection('callerCandidates').get();
            callerCandidates.forEach(async candidate => {
                await candidate.ref.delete();
            });
            await roomRef.delete();

        }

        document.location.reload(true);
    }

}










// Fonctions utilitaires
