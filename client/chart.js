
import DB from '../common/DB';

let commits = DB.Commits.find().fetch()
let users = DB.GithubUsers.find().fetch()
let repos = DB.Repos.find().fetch()

window.DB = DB
