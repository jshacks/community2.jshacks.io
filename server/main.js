import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import DB from '../common/DB';

import github from 'octonode';


const client = github.client(Meteor.settings.github.token);
const ghteam = client.team(Meteor.settings.github.teamid);

const asyncMembers = Meteor.wrapAsync(ghteam.members, ghteam);
const asyncRepos = Meteor.wrapAsync(ghteam.repos, ghteam);

// Meteor.startup(() => {
//   ghteam.repos(function(e,r){
//     if(!e) {
//       r.forEach((item)=>{
//         let ghrepo = client.repo(item.full_name);

//         ghrepo.commits((er,rez) => {
//           rez.forEach((item) => {
//             console.log(item.sha)
//             ghrepo.commit(item.sha, (e,ror) => {
//               console.log(ror);
//             });
//           });
//         });
//       });
//     }
//   });
// });


Meteor.methods({
  getGithubUsers: function() {

    asyncMembers((e,r) => {
      if(!e)
        r.forEach((item) => {
          DB.GithubUsers.upsert({
            userId: item.id
          }, {
            userId: item.id,
            login: item.login,
            avatar_url: item.avatar_url
          });
        });

    });
  },
  getGithubRepos: function() {
    ghteam.repos((e,r) => {
      if(!e)
        r.forEach((item) => {
          DB.Repos.upsert({
            repoId: item.id
          },{
            name: item.name,
            full_name: item.full_name,
            description: item.description,
            repoId: item.id
          });
        });
    });
  },
  getGithubCommits: function() {
    //get repos from db
    let repos = DB.Repos.find().fetch();

    repos.forEach((item)=>{
      //get latest commit from db
      let commit = DB.Commits.findOne({
        repoId: item.repoId
      },{
        order: {
          date: -1
        }
      });

      if (commit) {

        let ghrepo = client.repo(item.full_name);

        ghrepo.commits({
          since: commit.date
        },(e,r)=> {
          if(!e)
            r.forEach((item) => {
              ghrepo.commit(item.sha, (e,r) => {
                if(!e) {
                  DB.Commits.upsert({
                    sha: r.sha
                  },{
                    userId: r.author.id,
                    sha: r.sha,
                    stats: r.stats
                  })
                }
              }) 
            });
        });
      };

    });
    
  }
});