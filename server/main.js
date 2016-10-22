import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import DB from '../common/DB';

import github from 'octonode';


const client = github.client(Meteor.settings.github.token);
const ghteam = client.team(Meteor.settings.github.teamid);

const asyncMembers = Meteor.wrapAsync(ghteam.members, ghteam);
const asyncRepos = Meteor.wrapAsync(ghteam.repos, ghteam);

Meteor.startup(() => {
  SyncedCron.add({
    name: 'Run DB update',
    schedule: function(parser) {
      // parser is a later.parse object
      return parser.text('every 1 minute');
    },
    job: function() {
      Meteor.call('getGithubUsers');
      Meteor.call('getGithubRepos');
      Meteor.call('getGithubCommits');
    }
  });

  SyncedCron.start();
});


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
    asyncRepos((e,r) => {
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
    let query = {};

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
        query.since = commit.date;
      }

      let ghrepo = client.repo(item.full_name);

      let asyncGhcommits = Meteor.wrapAsync(ghrepo.commits, ghrepo);
      let asyncGhcommit = Meteor.wrapAsync(ghrepo.commit, ghrepo);

      asyncGhcommits(query,(e,r)=> {
        if(!e)
          r.forEach((item) => {
            asyncGhcommit(item.sha, (e,r) => {
              if(!e) {
                DB.Commits.upsert({
                  sha: r.sha
                },{
                  userId: (r.author)?r.author.id:(r.commiter)?r.commiter.id:'',
                  sha: r.sha,
                  stats: r.stats
                })
              }
            }) 
          });
      });
    });
  }
});