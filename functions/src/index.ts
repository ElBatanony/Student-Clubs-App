import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();
const db = admin.firestore();
const days : string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

export const updateClub = functions.firestore
    .document('clubs/{clubId}')
    .onWrite((change, context) => {

        // The id of the changed club
        const clubId : string = context.params.clubId
        // The club data (name, location, days, ...)
        const club = change.after.data() || {};

        if (clubId == 'summary') return 0;

        console.log('Updating summary with', clubId)

        // Read the summary doc
        return db.doc('clubs/summary').get()
        .then(summaryDoc => {
            const summary = summaryDoc.data() || {}
            
            summary.clubs[clubId] = club.name

            // Removing the club from summary
            for (let i=0; i<7; i+=1) {
                const day = summary[days[i]] || [];
                for (let j=0; j<day.length; j+=1) {
                    if ( day[j].clubId == clubId ) {
                        //console.log('Removed from ', days[i])
                        day.splice(j, 1)
                        j-=1
                    } 
                }
                summary[days[i]] = day
            }
            // Adding the club to summary
            for (let i = 0; i < 7; i += 1) {
                const day : any = club[days[i]] || null;
                if (!day) continue
                summary[days[i]].push({
                    clubId: clubId,
                    name: club.name || 'No Name',
                    location: day.location || '',
                    start: day.start || '',
                    end: day.end || ''
                })
            }

            return db.doc('clubs/summary').set(summary);
        })

        // Get an object representing the document
        // e.g. {'name': 'Marie', 'age': 66}
        //const newValue = change.after.data() || {};

        // ...or the previous value before this update
        //const previousValue = change.before.data();

        // access a particular field as you would any JS property
        //const name = newValue.name;

        // perform desired operations ...
        
        /*let count: number = (newValue.count || 0)
        if (count % 2 == 0) return 'not changed'

        return change.after.ref.set({
            name_change_count: count + 1
        }, { merge: true }).then(() => {
            console.log("man, that's cool")
            return "yep"
        } );*/
    });

export const requestAttendance = functions.https.onCall((data, context) => {
    if (context.auth!.uid) {
        return db.collection("clubs")
          .doc(data.club)
          .collection("days")
          .doc(data.day)
          .set(
            {
              requests: admin.firestore.FieldValue.arrayUnion(
                context.auth!.token.email
              )
            },
            { merge: true }
          )
          .then( () => 'Request sent successfully!')
          .catch( (err) => {
              console.error(err)
              return 'Error sending request'
          });
    } else {
        return 'Permission denied: Logged in users only'
    }
});