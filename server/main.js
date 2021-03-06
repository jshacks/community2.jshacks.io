import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import execOrig from 'exec'
import * as Kefir from 'kefir'
import R from 'ramda'

const root = process.cwd().split('.meteor')[0]
const clocLocation = (process.env.NODE_ENV === "production")?"/app/node_modules/.bin/cloc":`${root}/node_modules/.bin/cloc`;
//console.log(root, process.cwd());
const exec = (cmds) => Kefir.fromCallback(cb => {
  execOrig(cmds, (err, out, code) => {
    if (err instanceof Error)
      throw err;
    cb(out)
  })
});

const getRepo = repo =>
  exec(`mkdir -p ${root}/.repos && cd ${root}/.repos && git clone https://github.com/jshacks/${repo}`)
    .map(x => repo)

const getCloc = repo =>
  exec([`${clocLocation}`, '--exclude-dir=node_modules,bower_modules,semantic-ui,libs,lib,library', '--json', `${root}/.repos/${repo}`])
    .map(x => JSON.parse(x))
    .map(R.omit('header'))
    .map(x => ([repo, x]))


import DB from '../common/DB';

import github from 'octonode';


const client = github.client(Meteor.settings.github.token);
const ghteam = client.team(Meteor.settings.github.teamid);

const asyncLimit = Meteor.wrapAsync(client.limit, client);

const asyncMembers = Meteor.wrapAsync(ghteam.members, ghteam);
const asyncRepos = Meteor.wrapAsync(ghteam.repos, ghteam);

function foo(repo,cb) {
  let repos = (repo)?[repo]:R.map(R.prop('name'), DB.Repos.find().fetch())

  Kefir
    .constant(repos)
    .flatten()
    .flatMap(getRepo)
    .flatMap(getCloc)
    .bufferWhile(R.T)
    .onValue(cb)
    .onError(cb)
}

const asyncFoo = Meteor.wrapAsync(foo)

const getData = function() {
  asyncLimit((e,l,m) => {
    if(!e) {
      if(m-l < 10) {
        console.log('Rate limit reached');
      } else {
        Meteor.call('getGithubUsers');
        Meteor.call('getGithubRepos');
        Meteor.call('getGithubCommits');
        Meteor.call('getGithubIssues');
        Meteor.call('getGithubBranches');
      }
    }
  });
}

Meteor.startup(() => {
  SyncedCron.add({
    name: 'Run DB update',
    schedule: function(parser) {
      // parser is a later.parse object
      return parser.text('every 20 minutes');
    },
    job: getData
  });

  SyncedCron.start();
  Meteor.call('getClocRepos');
  Meteor.call('getGithubCommits');

  //checking if server has been initialised

  let hasData = DB.GithubUsers.findOne();

  if(!hasData) {
    getData();
  }
});


Meteor.methods({
  getGithubUsers: function() {
    this.unblock();
    if(this.connection) throw new Meteor.Error("You cannot call this from the client");
    asyncMembers({
      per_page: 500
    },(e, members) => {
      if(e) {
        console.error(e)
        return
      }

      members.forEach(member => {
        let user = client.user(member.login)

        let asyncFollowers = Meteor.wrapAsync(user.followers, user);
        let asyncFollowing = Meteor.wrapAsync(user.following, user)
        asyncFollowers((e, followers) => {

          asyncFollowing((e, following) => {

            DB.GithubUsers.upsert({
              userId: member.id
            }, {
              $set: {
                userId: member.id,
                login: member.login,
                avatar_url: member.avatar_url,
                gravatar_url: member.gravatar_url,
                html_url: member.html_url,
                followers: followers.map(x => x.login),
                following: following.map(x => x.login)
              }
            });

          })

        })

      })

    });

  },
  getGithubRepos: function() {
    this.unblock();
    if(this.connection) throw new Meteor.Error("You cannot call this from the client");
    
    asyncRepos({
      per_page: 500
    },(e,r) => {
      if(!e)
        r.forEach((item) => {
          DB.Repos.upsert({
            repoId: item.id
          },{
            $set: {
              name: item.name,
              full_name: item.full_name,
              description: item.description,
              html_url: item.html_url,
              repoId: item.id
            }
          });
        });
    });
  },
  getClocRepos: function () {
    this.unblock();
    if(this.connection) throw new Meteor.Error("You cannot call this from the client");    
    asyncFoo(null,r => {
      _.each(r, i => {
        DB.Repos.update({
          'name': i[0]
        },{
          $set: {
            cloc: i[1]
          }
        });
      });
      
    })
  },
  getClocRepo: function (repo) {
    this.unblock();
    if(this.connection) throw new Meteor.Error("You cannot call this from the client");    
    asyncFoo(repo,r => {
      _.each(r, i => {
        DB.Repos.update({
          'name': i[0]
        },{
          $set: {
            cloc: i[1]
          }
        });
      });
      
    })
  },
  getGithubCommits: function() {
    this.unblock();
    if(this.connection) throw new Meteor.Error("You cannot call this from the client");    
    //get repos from db
    let repos = DB.Repos.find().fetch();
    let query = {
      per_page: 2000
    };

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
        if(!e) {
          
          r.forEach((i) => {
            asyncGhcommit(i.sha, (e,r) => {
              console.log(e)
              if(!e) {
                DB.Commits.upsert({
                  sha: r.sha
                },{
                  $set: {
                    userId: (r.author)?r.author.id:(r.commiter)?r.commiter.id:'',
                    sha: r.sha,
                    stats: r.stats,
                    data: r.commit.author.date,
                    repoId: item.repoId,
                    body: r
                  }
                });
              }
            }) 
          });
          if(r.length > 0) {
            getClocRepo(item.name);
          }
        }
      });
    });
  },
  getGithubIssues: function() {
    this.unblock();
    if(this.connection) throw new Meteor.Error("You cannot call this from the client");    
    //get repos from db
    let repos = DB.Repos.find().fetch();
    let query = {
      per_page: 1000
    };

    repos.forEach((item)=>{
      //get latest commit from db
      let issue = DB.Issues.findOne({
        repoId: item.repoId
      },{
        order: {
          date: -1
        }
      });

      if (issue) {
        query.since = issue.date;
      }

      let ghrepo = client.repo(item.full_name);

      let asyncGhissues = Meteor.wrapAsync(ghrepo.issues, ghrepo);

      asyncGhissues(query,(e,r)=> {
        if(!e)
          r.forEach((i) => {
            DB.Issues.upsert({
              issueId: i.id
            },{
              $set: {
                repoId: item.repoId,
                issueId: i.id,
                number: i.number,
                state: i.state,
                title: i.title,
                body: i.body,
                userId: i.user.id,
                labels: i.labels,
                asigneeId: (i.asignee)?i.asignee.id:null,
                data: i.created_at,
                dataUpd: i.updated_at,
                reactions: (i.reactions)?i.reactions:null
              }
            });
          });
      });
    });
  },
  getGithubBranches: function() {
    this.unblock();
    if(this.connection) throw new Meteor.Error("You cannot call this from the client");    
    //get repos from db
    let repos = DB.Repos.find().fetch();
    let query = {
      per_page: 1000
    };

    repos.forEach((item)=>{

      let ghrepo = client.repo(item.full_name);

      let asyncGhbranches = Meteor.wrapAsync(ghrepo.branches, ghrepo);

      asyncGhbranches((e,r)=> {
        if(!e)
          r.forEach((i) => {
            DB.Branches.upsert({
              branchId: i.name
            },{
              $set: {
                repoId: item.repoId,
                branchId: i.name
              }
            });
          });
      });
    });
  },
  removeAllData: function() {
    if(this.connection) throw new Meteor.Error("You cannot call this from the client");    
    _.each(DB, function(item) {
      item.remove({});
    })
  }
});

Meteor.publish('allUsers',function(){
  return DB.GithubUsers.find();
});
Meteor.publish('allRepos',function(){
  return DB.Repos.find();
});
Meteor.publish('allCommits',function(){
  return DB.Commits.find({},{
    fields: {
      body: 0
    }
  });
});
Meteor.publish('allIssues', function(){
  return DB.Issues.find();
});
Meteor.publish('allBranches', function(){
  return DB.Branches.find();
});


