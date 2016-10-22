import { Meteor } from 'meteor/meteor';

import github from 'octonode';



const client = github.client(Meteor.settings.github.token);
const ghteam = client.team(Meteor.settings.github.teamid);

Meteor.startup(() => {
  ghteam.repos(function(e,r){
    if(!e) {
      r.forEach((item)=>{
        let ghrepo = client.repo(item.full_name);

        ghrepo.commits((er,rez) => {
          rez.forEach((item) => {
            console.log(item.sha)
            ghrepo.commit(item.sha, (e,ror) => {
              console.log(ror);
            });
          });
        });
      });
    }
  });
});


Meteor.methods({
  getGithubData: function() {
    console.log(client.me())
  }
});