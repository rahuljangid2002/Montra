public class LeadControllerForBypassDuplicateRule {
    
    @AuraEnabled
    public static Boolean isDuplicate(String mobile) {
        List<Lead> leads = [SELECT Id FROM Lead WHERE MobilePhone = :mobile LIMIT 1];
        return !leads.isEmpty();
    }
    @AuraEnabled
    public static Id quickLeadCapture(Lead newLead){
        Database.DMLOptions dmo = new Database.DMLOptions();
        dmo.DuplicateRuleHeader.allowSave = true;
        Database.insert(newLead, dmo);
        return newLead.Id;
    }
    
    @AuraEnabled
    public static void sendNotification(String userIds, String title, String body, String targetRecordId) {
        try {
            Messaging.CustomNotification notification = new Messaging.CustomNotification();
            notification.setBody(body);
            notification.setTitle(title);
            notification.setSenderId(Userinfo.getUserId());
            CustomNotificationType type = [SELECT Id FROM CustomNotificationType WHERE DeveloperName = 'Generic_Record_Notification' LIMIT 1];
            notification.setNotificationTypeId(type.id);
            notification.setTargetId(targetRecordId);
            notification.send(new Set<String>{userIds});
        } catch (Exception e) {
            System.debug('Error sending notification: ' + e.getMessage());
        }
    }  
    
}