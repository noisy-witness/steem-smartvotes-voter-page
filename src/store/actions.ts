import { ActionTree } from "vuex";
import { State } from "./State";
import { Api } from "../api/Api";
import { smartvotes_ruleset, smartvotes_voteorder } from "steem-smartvotes";

export const actions: ActionTree<State, State> = {
    setVoterUsername: ({ commit, dispatch, state }, voterUsername: string): void => {
        commit("setVoterUsername", voterUsername);
        dispatch("checkRulesetsLoadedFor");
        dispatch("setVoteData", state.voteData); // reset
    },
    setDelegatorUsername: ({ commit, dispatch, state }, delegatorUsername: string): void => {
        commit("setDelegatorUsername", delegatorUsername);
        dispatch("checkRulesetsLoadedFor");
        dispatch("setVoteData", state.voteData); // reset
    },
    setRulesetsLoadedFor: ({ commit, dispatch, state }, payload: {voter: string, delegator: string}): void => {
        commit("setRulesetsLoadedFor", payload);
        dispatch("checkRulesetsLoadedFor");
    },
    checkRulesetsLoadedFor: ({ commit, dispatch, state }): void => {
        if (state.voterUsername !== state.rulesetsLoadedFor.voter
                || state.delegatorUsername !== state.rulesetsLoadedFor.delegator) {
            commit("setRulesetsLoadedFor", { voter: "", delegator: "" });
            commit("setRulesets", { rulesets: [] });
            commit("setSelectedRulesetIndex", -1);
        }
    },
    loadRulesets: ({ commit, dispatch, state }): void => {
        commit("setRulesetLoadingState", {inProggress: true, error: "", message: "Checking if accounts exist..."});
        const voterUsername = state.voterUsername;
        const delegatorUsername = state.delegatorUsername;
        commit("setSent", false);
        Api.validateAccountsExistence(delegatorUsername, voterUsername)
        .then(() => {
            commit("setRulesetLoadingState", {
                inProggress: true, error: "", message: "Accounts exist. Loading rulesets...",
            });
        })
        .then(Api.loadRulesets(delegatorUsername, voterUsername))
        .then((rulesets: smartvotes_ruleset []) => {
            commit("setRulesets", { rulesets: rulesets });
            dispatch("setSelectedRulesetIndex", (rulesets.length > 0 ? 0 : -1));
            commit("setRulesetLoadingState", { inProggress: false, error: "", message: "" });
            commit("setRulesetsLoadedFor", { voter: voterUsername, delegator: delegatorUsername });
        })
        .catch(error => {
            commit("setRulesetLoadingState", { inProggress: false, error: error.message, message: ""});
        });
    },
    setSelectedRulesetIndex: ({ commit, dispatch, state }, payload: number): void => {
        commit("setSelectedRulesetIndex", payload);
        dispatch("setVoteData", state.voteData);
    },
    setVoteData: ({ commit, dispatch, state },
                  payload: { author: string, permlink: string, weight: number, action: "upvote" | "flag" }): void => {
        commit("setVoteData", payload);
        commit("setSent", false);
        dispatch("setValidated", false);
    },
    validateVoteorder: ({ commit, dispatch, state }, payload: boolean): void => {
        commit("setVoteorderValidationState", {inProggress: true, error: "", message: "Validating voteorder..."});
        commit("setSent", false);
        const voteorder: smartvotes_voteorder = {
            ruleset_name: state.rulesets[state.selectedRulesetIndex].name,
            delegator: state.delegatorUsername,
            author: state.voteData.author,
            permlink: state.voteData.permlink,
            type: state.voteData.action,
            weight: state.voteData.weight,
        };
        Api.validateVoteorder(state.voterUsername, voteorder, (msg: string, proggress: number): void => {
            commit("setVoteorderValidationState", { inProggress: true, error: "", message: msg });
        })
        .then(() => {
            commit("setVoteorderValidationState", { inProggress: false, error: "", message: "" });
            commit("setValidated", true);
        })
        .catch(error => {
            commit("setVoteorderValidationState", { inProggress: false, error: error.message, message: ""});
            commit("setValidated", false);
        });
    },
    setValidated: ({ commit, dispatch, state }, payload: boolean): void => {
        commit("setValidated", payload);
    },
    sendSmartvote: ({ commit, dispatch, state }, payload: boolean): void => {
        commit("setSendingState", {inProggress: true, error: "", message: "Sending voteorder..."});
        commit("setSent", false);
        const voteorder: smartvotes_voteorder = {
            ruleset_name: state.rulesets[state.selectedRulesetIndex].name,
            delegator: state.delegatorUsername,
            author: state.voteData.author,
            permlink: state.voteData.permlink,
            type: state.voteData.action,
            weight: parseInt(state.voteData.weight + "", 10),
        };
        Api.sendVoteorder(state.voterUsername, state.postingWif, voteorder, (msg: string, proggress: number): void => {
            commit("setSendingState", { inProggress: true, error: "", message: msg });
        })
        .then(() => {
            commit("setSendingState", { inProggress: false, error: "", message: "" });
            commit("setSent", true);
        })
        .catch(error => {
            commit("setSendingState", { inProggress: false, error: error.message, message: ""});
            commit("setSent", false);
        });
    },
};