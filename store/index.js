import { db } from '~/plugins/firebase.js'
import { collection, doc, setDoc, addDoc, onSnapshot, getDoc, getDocs, deleteDoc, updateDoc } from "firebase/firestore"


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

    updateRoomId(state, id) {
        state.roomId = id;
    },

    initializeStream(state) {
        state.localStream = null;
        state.remoteStream = null;
    },

    initializeRoomId(state) {
        state.roomId = null;
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

        console.log("room ref  création d'offre", roomWithOffer)
        let roomRef = await addDoc(collection(db, "rooms"), roomWithOffer)

        commit('updateRoomId', roomRef.id)

        console.log(`New room created with SDP offer. Room ID: ${roomRef.id}`);



        // Code for collecting ICE candidates below

        const callerCandidatesCollectionRef = collection(db, "rooms", roomRef.id, "callerCandidates")

        state.peerConnection.addEventListener('icecandidate', async (event) => {
            if (!event.candidate) {
                console.log('Got final candidate!');
                return;
            }
            console.log('Got candidate: ', event.candidate);
            await addDoc(callerCandidatesCollectionRef, event.candidate.toJSON())
            // callerCandidatesCollection.add(event.candidate.toJSON());
        });





        //Ecouter le track sur la connexion
        state.peerConnection.addEventListener('track', event => {
            console.log('Got remote track:', event.streams[0]);
            event.streams[0].getTracks().forEach(track => {
                console.log('Add a track to the remoteStream:', track);
                state.remoteStream.addTrack(track);
            });
        });


        // Ecouter les données dans Firebase pour voir si quelqu'un répond à l'appel
        const unListenRoom = onSnapshot(doc(db, "rooms", roomRef.id), async (doc) => {
            const data = doc.data();
            console.log("Current data: ", data);
            if (!state.peerConnection.currentRemoteDescription && data && data.answer) {
                console.log('Got remote description: ', data.answer);
                const rtcSessionDescription = new RTCSessionDescription(data.answer);
                await state.peerConnection.setRemoteDescription(rtcSessionDescription);
            }
        });


        // Ecouter la collection sur calle Candidate
        const unListenCalleCandidate = onSnapshot(callerCandidatesCollectionRef, async (snapshot) => {
            snapshot.forEach(async change => {
                if (change.type === 'added') {
                    let data = change.doc.data();
                    console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                    await state.peerConnection.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        })



    },

    async joinRoomById({ commit, state }, enterRoomId) {

        console.log(enterRoomId)
        const roomSnapshot = await getDoc(doc(db, "rooms", enterRoomId));
        console.log('Got room:', roomSnapshot.exists());

        if (roomSnapshot.exists()) {

            console.log('Create PeerConnection with configuration: ', configuration);

            commit('updatePeerConnection', new RTCPeerConnection(configuration))
            commit('registerPeerConnectionListeners')

            console.log('local stream ', state.localStream)

            state.localStream.getTracks().forEach(track => {
                state.peerConnection.addTrack(track, state.localStream);
            });


            // Code for collecting ICE candidates below
            const calleeCandidatesCollection = collection(db, "rooms", enterRoomId, "calleeCandidates");

            state.peerConnection.addEventListener('icecandidate', async (event) => {
                if (!event.candidate) {
                    console.log('Got final candidate!');
                    return;
                }
                console.log('Got candidate: ', event.candidate);
                await addDoc(calleeCandidatesCollection, event.candidate.toJSON())
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

            await updateDoc(doc(db, "rooms", enterRoomId), roomWithAnswer)


            const unListenCalleCandidate = onSnapshot(calleeCandidatesCollection, async (snapshot) => {
                snapshot.forEach(async change => {
                    if (change.type === 'added') {
                        let data = change.doc.data();
                        console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
                        await state.peerConnection.addIceCandidate(new RTCIceCandidate(data));
                    }
                });
            })


            console.log("tout exécuté")
        }
    },


    async hangUp({ commit, state }) {

        state.localStream.getTracks().forEach(track => track.stop())

        if (state.remoteStream) {
            state.remoteStream.getTracks().forEach(track => track.stop())
        }

        if (state.peerConnection) {
            state.peerConnection.close()
        }

        commit('initializeStream')

        if (state.roomId) {

            const calleeCandidates = await getDocs(collection(db, "rooms", state.roomId, "calleeCandidates"))
            calleeCandidates.forEach(async candidate => {
                await deleteDoc(doc(db, "rooms", state.roomId, "calleeCandidates", candidate.id))
            });


            const callerCandidates = await getDocs(collection(db, "rooms", state.roomId, "callerCandidates"))
            callerCandidates.forEach(async candidate => {
                await deleteDoc(doc(db, "rooms", state.roomId, "callerCandidates", candidate.id))
            });

            await deleteDoc(doc(db, "rooms", state.roomId))

            commit('initializeRoomId')

        }

        document.location.reload(true);
    }

}










// Fonctions utilitaires
