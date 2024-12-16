/*
    Developer Name : Rahul Jangid
    Created Date : 14/12/2024
    Last Modified By  |  Last Modified Date  |  Version
    Rahul Jangid          14/12/2024            Initial Verison
*/

global class AssignLeadTasksToManagerBatch implements Database.Batchable<sObject> {
    global Database.QueryLocator start(Database.BatchableContext BC){
        String query = 'SELECT Id, OwnerId, CreatedDate FROM Task where Status = \'Open\' AND who.type = \'Lead\' AND (Escalated_TSM_Task__c = NULL OR  Escalated_RSM_Task__c = null OR Escalated_ZSH_Task__c = NULL OR Escalated_NSSH_Task__c = NULL) LIMIT 50000';
        return Database.getQueryLocator(query);
    }
    global void execute(Database.BatchableContext BC, List<Task> scope){
        if(!scope.isEmpty()) {
            List<Task_Escalation_Matrix__mdt> escalationMetadata = [SELECT DeveloperName, Escalation_Time_In_hours__c FROM Task_Escalation_Matrix__mdt WHERE Escalation_Time_In_hours__c != NULL AND Active__c = true];
            if(!escalationMetadata.isEmpty()){
                Map<String, Decimal> escalationHoursInMinutes = new Map<String, Decimal>();
                for(Task_Escalation_Matrix__mdt record : escalationMetadata) {
                    Decimal escelatedHoursInMinutes = record.Escalation_Time_In_hours__c * 60;
                    escalationHoursInMinutes.put(record.DeveloperName, escelatedHoursInMinutes);
                }
                set<Id> taskOwnerIds = new set<Id>();
                for(Task task : scope) {
                    taskOwnerIds.add(task.OwnerId);
                }
                Map<Id, User> usersMap = new Map<Id, user>([SELECT Id, Name, ManagerId, Account.TSM__c, UserRole.name, Profile.Name FROM User WHERE Id IN :taskOwnerIds AND IsActive = true]);
                if(!usersMap.isEmpty()){
                    Map<Id, Integer> countOfTaskAgainstOwnerMap = new Map<Id, Integer>();
                    for(Task task : scope) {
                        if(usersMap.containsKey(task.OwnerId)){
                            Decimal diffInMinutes = (System.now().getTime() - task.CreatedDate.getTime()) / (1000 * 60);
                            String metadataDeveloperName;
                            if(usersMap.get(task.OwnerId).Profile.Name == 'Montra Partner Profile'){
                                metadataDeveloperName = 'DSE_Sales';
                            }else if(usersMap.get(task.OwnerId).UserRole.Name == 'TSM - Sales'){
                                metadataDeveloperName = 'TSM_Sales';
                            }else if(usersMap.get(task.OwnerId).UserRole.Name == 'RSM - Sales'){
                                metadataDeveloperName = 'RSM_Sales';
                            }else if(usersMap.get(task.OwnerId).UserRole.Name == 'ZSH - Sales'){
                                metadataDeveloperName = 'ZSH_Sales';
                            }

                            if(String.isNotBlank(metadataDeveloperName) && escalationHoursInMinutes.containsKey(metadataDeveloperName) && diffInMinutes >= escalationHoursInMinutes.get(metadataDeveloperName)){
                                if(!countOfTaskAgainstOwnerMap.containsKey(task.OwnerId)){
                                    countOfTaskAgainstOwnerMap.put(task.OwnerId, 1);
                                }else{
                                    countOfTaskAgainstOwnerMap.put(task.OwnerId, countOfTaskAgainstOwnerMap.get(task.OwnerId) + 1);
                                }
                            }
                        }
                    }

                    if(!countOfTaskAgainstOwnerMap.isEmpty()){
                        List<Task> toInsertTask = new List<Task>();
                        Map<String, String> associatedManagerMap = new Map<String, String>();
                        for(Id ownerId : countOfTaskAgainstOwnerMap.keySet()){
                            Task followUpTask = new Task();
                            followUpTask.Subject = 'Escalation: ' + countOfTaskAgainstOwnerMap.get(ownerId) + ' Incomplete Tasks by ' + usersMap.get(ownerId).Name;
                            followUpTask.ActivityDate = System.today().addDays(1);
                            followUpTask.Priority = 'High';
                            followUpTask.Status = 'Open';
                            followUpTask.Escalated_By__c = ownerId;
                            if(usersMap.get(ownerId).Profile.Name == 'Montra Partner Profile'){
                                if(usersMap.get(ownerId).Account.TSM__c != NULL){
                                    followUpTask.OwnerId = usersMap.get(ownerId).Account.TSM__c;
                                    toInsertTask.add(followUpTask);
                                }
                            }else{
                                followUpTask.OwnerId =  usersMap.get(ownerId).ManagerId;
                                toInsertTask.add(followUpTask);
                            }
                        }

                        if(!toInsertTask.isEmpty()){
                            try{
                                Insert toInsertTask;
                                Map<Id, String> taskIdVsOwnerId = new Map<Id, String>();
                                for(Task task : toInsertTask){
                                    taskIdVsOwnerId.put(task.Escalated_By__c, task.Id);
                                }

                                List<Task> taskToUpdate = new List<Task>();
                                for(Task task : scope) {
                                    if(taskIdVsOwnerId.containsKey(task.OwnerId)){
                                        Decimal diffInMinutes = (System.now().getTime() - task.CreatedDate.getTime()) / (1000 * 60);
                                        String metadataDeveloperName;
                                        if(usersMap.get(task.OwnerId).Profile.Name == 'Montra Partner Profile'){
                                            metadataDeveloperName = 'DSE_Sales';
                                        }else if(usersMap.get(task.OwnerId).UserRole.Name == 'TSM - Sales'){
                                            metadataDeveloperName = 'TSM_Sales';
                                        }else if(usersMap.get(task.OwnerId).UserRole.Name == 'RSM - Sales'){
                                            metadataDeveloperName = 'RSM_Sales';
                                        }else if(usersMap.get(task.OwnerId).UserRole.Name == 'ZSH - Sales'){
                                            metadataDeveloperName = 'ZSH_Sales';
                                        }
                                        if(String.isNotBlank(metadataDeveloperName) && escalationHoursInMinutes.containsKey(metadataDeveloperName) && diffInMinutes >= escalationHoursInMinutes.get(metadataDeveloperName)){
                                            Task updateTask = new Task();
                                            updateTask.Id = task.Id;
                                            String escalatedFieldAPIName;
                                            if(usersMap.get(task.OwnerId).Profile.Name == 'Montra Partner Profile'){
                                                escalatedFieldAPIName = 'Escalated_TSM_Task__c';
                                            }else if(usersMap.get(task.OwnerId).UserRole.Name == 'TSM - Sales'){
                                                escalatedFieldAPIName = 'Escalated_RSM_Task__c';
                                            }
                                            else if(usersMap.get(task.OwnerId).UserRole.Name == 'RSM - Sales'){
                                                escalatedFieldAPIName = 'Escalated_ZSH_Task__c';
                                            }
                                            else if(usersMap.get(task.OwnerId).UserRole.Name == 'ZSH - Sales'){
                                                escalatedFieldAPIName = 'Escalated_NSSH_Task__c';
                                            }

                                            if(String.isNotBlank(escalatedFieldAPIName)){
                                                updateTask.put(escalatedFieldAPIName, taskIdVsOwnerId.get(task.OwnerId));
                                                taskToUpdate.add(updateTask);
                                            }   
                                        }
                                    }
                                }

                                if(!taskToUpdate.isEmpty()){
                                    Update taskToUpdate;
                                }
                            }catch(Exception e){
                                System.debug('Exception Message '+e.getMessage());
                                System.debug('Error Line : '+e.getLineNumber());
                            }
                        }
                    }
                }
            }
        }
    }
    global void finish(Database.BatchableContext BC) {
    }
}