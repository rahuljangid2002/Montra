/*
    Developer Name : Rahul Jangid
    Created Date : 15/12/2024
    Corn Exp. : 0 0 9 * * ? (this corn expression run this scheduler every at 9 AM)
    Last Modified By  |  Last Modified Date  |  Version
    Rahul Jangid          15/12/2024            Initial Verison
*/
global class AssignLeadTasksScheduler implements Schedulable {
    global void execute(SchedulableContext sc) {
        AssignLeadTasksToManagerBatch batch = new AssignLeadTasksToManagerBatch();
        Database.executeBatch(batch, 500);
    }
}
