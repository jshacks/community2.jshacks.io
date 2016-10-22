import { Mongo } from 'meteor/mongo';

DB = {};

DB.GithubUsers = new Mongo.Collection('github-users');
DB.Repos = new Mongo.Collection('github-repos');
DB.Commits = new Mongo.Collection('github-commits');
DB.Issues = new Mongo.Collection('github-issues');
DB.Branches = new Mongo.Collection('github-branches');

export default DB;