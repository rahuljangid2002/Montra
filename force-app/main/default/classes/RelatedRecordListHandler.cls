/*
    Developer Name : Rahul Jangid
    Created Date : 15/12/2024
    Last Modified By  |  Last Modified Date  |  Version
    Rahul Jangid          15/12/2024            Initial Verison
*/
public class RelatedRecordListHandler {
    @auraEnabled
    public static String fetchRecord(String ChildObjectName , String RecordId, String FieldSetName){
        WrapperReturn returnData = new WrapperReturn();
        try{
            if(doesObjectExist(ChildObjectName)){
                if(doesFieldSetExist(ChildObjectName, FieldSetName)){
                    list<Field> fields = fetchFieldsFromFieldSet(ChildObjectName, fieldSetName);
                    if(!fields.isEmpty()){
                        String query = 'SELECT ';
                        List<String> fieldsList = new List<String>();
                        for(Field field : fields){
                            fieldsList.add(field.name);
                        }
                        if(!fieldsList.contains('id') && !fieldsList.contains('Id')){
                            fieldsList.add('Id');
                        }else{
                            if(fieldsList.contains('id')){
                                Integer index = fieldsList.indexOf('id');
                                if(index != -1){
                                    fieldsList[index] = 'Id';
                                }
                            }
                        }
                        String FieldName;
                        User userRecord=[Select Id, UserRole.name, Profile.Name FROM User where Id=:userinfo.getUserId() LIMIT 1];

                        if(userRecord.UserRole.Name != null){
                            if(userRecord.UserRole.Name == 'RSM - Sales'){
                                FieldName = 'Escalated_RSM_Task__c';
                            }else if(userRecord.UserRole.Name == 'ZSH - Sales'){
                                FieldName = 'Escalated_ZSH_Task__c';
                            }else if(userRecord.UserRole.Name == 'NSH - Sales/Service'){
                                FieldName = 'Escalated_NSSH_Task__c';
                            }else{
                                FieldName = 'Escalated_TSM_Task__c';
                            }
                        }else{
                            FieldName = 'Escalated_TSM_Task__c';
                        }

                        query += String.join(fieldsList, ', ')+' FROM '+ChildObjectName+ ' WHERE ' +FieldName+ '= \''+RecordId+'\'';
                        List<Sobject> records = Database.query(query); 
                        if(!records.isEmpty()){
                            returnData.statusCode = 200;
                            returnData.successMessage = 'Records Found';
                            returnData.Data = JSON.serialize(records);
                            returnData.fields = JSON.serialize(fields);   
                        }else{
                            returnData.statusCode = 404;
                            returnData.errorMessage = 'Records List is Empty';
                        }
                    }else{
                        returnData.statusCode = 404;
                        returnData.errorMessage = 'Field set is Empty';
                    }
                }else{
                    returnData.statusCode = 404;
                    returnData.errorMessage = 'Field set ' + FieldSetName + ' does not exist on object ' + ChildObjectName + '.';
                }
            }else{
                returnData.statusCode = 404;
                returnData.errorMessage = 'Invalid object API name: ' + ChildObjectName;
            }	
        }catch(Exception e){
            returnData.statusCode = 400;
            returnData.errorMessage = 'Error : '+e.getMessage()+' Error on Line : '+String.valueOf(e.getLineNumber());
        }
        return JSON.serialize(returnData);
    }
    
    public static Boolean doesObjectExist(String objectName) {
        Map<String, Schema.SObjectType> globalDescribe = Schema.getGlobalDescribe();
        return globalDescribe.containsKey(objectName);
    }

    public static Boolean doesFieldSetExist(String objectApiName, String fieldSetName) {
        Schema.SObjectType sObjectType = Schema.getGlobalDescribe().get(objectApiName);
        Map<String, Schema.FieldSet> fieldSetMap = sObjectType.getDescribe().fieldSets.getMap();
        return fieldSetMap.containsKey(fieldSetName);
    }
    
     @AuraEnabled(cacheable=true)
    public static list<Field> fetchFieldsFromFieldSet(string objectName, string fieldSetName) {
        list<Field> fields  = new list<Field>();
        Schema.DescribeSobjectResult sobjectResult = Schema.describeSObjects(new list<string>{objectName})[0];
        map<String, Schema.FieldSet> fieldSetsMap = sobjectResult.fieldSets.getMap();
        Schema.FieldSet fieldSet = fieldSetsMap.get(fieldSetName);
        List<Schema.FieldSetMember> fieldSetMembers = fieldSet.getFields();
        for(Schema.FieldSetMember member : fieldSetMembers) {
            Field field = new Field();
            field.name = member.getFieldPath();
            field.required = member.getRequired();
            field.label = member.getLabel();
            field.type = member.getType().name();
            if(member.getType() == Schema.DisplayType.PICKLIST || member.getType() == Schema.DisplayType.MULTIPICKLIST) {
                field.picklistValues = formatPicklistEntries(member.getSObjectField().getDescribe());
            }
            fields.add(field);
        }
        return fields;
    }
    
    private static list<Picklist> formatPicklistEntries(Schema.DescribeFieldResult fieldResult) {
        list<Picklist> picklistValues = new list<Picklist>();
        list<Schema.PicklistEntry> pleList = fieldResult.getPicklistValues();
        for(Schema.PicklistEntry ple : pleList) {
            Picklist picklist = new Picklist(ple.value, ple.label);
            picklistValues.add(picklist);
        }
        return picklistValues;
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, String> getObjectPluralName(String objectName, String recordId) {
        Schema.SObjectType objectType = Schema.getGlobalDescribe().get(objectName);
        if (objectType != null) {
            Schema.DescribeSObjectResult describeResult = objectType.getDescribe();
            SObject record = Database.query('SELECT Id, Subject FROM ' + objectName + ' WHERE Id = :recordId');
            Map<String, String> returnMap = new Map<String, String>();
            returnMap.put('Name',(String)record.get('Subject'));
            returnMap.put('PluralName',describeResult.getLabelPlural());
            return returnMap;
        }
        return null;
    }
    
    public class Field {
        @AuraEnabled
        public string name;
        @AuraEnabled
        public Boolean required;
        @AuraEnabled 
        public string label;
        @AuraEnabled 
        public string type;
        @AuraEnabled 
        public Boolean isReadOnly; 
        @AuraEnabled 
        public list<Picklist> picklistValues;
        @AuraEnabled        
        public Boolean isCustomLookUp; 
        @AuraEnabled 
        public string criteria; 

        public Field() {
            isReadOnly = false;
            picklistValues = new list<Picklist>();
            isCustomLookUp = false; 
        }
    }
    
    public class Picklist {
        @AuraEnabled 
        public string value;
        @AuraEnabled 
        public string label;

        public Picklist(String value, String label) {
            this.value = value;
            this.label = label;    
        }
    }
    
    public class WrapperReturn{
        public Integer statusCode;
        public String errorMessage;
        public String successMessage;
        public String Data;
        public String fields;
    }
    
}