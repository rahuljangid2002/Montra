import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from "lightning/navigation";
import getObjectPluralName from '@salesforce/apex/RelatedRecordListHandler.getObjectPluralName';

export default class RelatedListViewAllComponent extends NavigationMixin(LightningElement) {
    @api columns;
    @api recordData;
    @api StandardIconName;
    @api Title;
    @api objectApiName;
    @api recordId;
    @track Name;
    @track pluralName = this.objectApiName;
    sortedBy;
    sortedDirection = 'asc';

    @wire(getObjectPluralName, { objectName: '$objectApiName', recordId: '$recordId' })
    wiredPluralName({ error, data }) {
        if (data) {
            this.Name = data.Name;
            this.pluralName = data.PluralName;
        } else if (error) {
            console.error('Error fetching plural name:', error);
        }
    }

    handleSort(event) {
        const { fieldName: sortedBy, sortDirection } = event.detail;
        const cloneData = [...this.recordData];

        if(sortedBy == 'nameUrl'){
            cloneData.sort((a, b) => {
                const aVal = a['Subject'] ? a['Subject'] : '';
                const bVal = b['Subject'] ? b['Subject'] : '';
    
                return aVal.localeCompare(bVal, undefined, { numeric: true });
            }); 
        }else{
            cloneData.sort((a, b) => {
                const aVal = a[sortedBy] ? a[sortedBy] : '';
                const bVal = b[sortedBy] ? b[sortedBy] : '';
    
                return aVal.localeCompare(bVal, undefined, { numeric: true });
            });         
        }

        this.recordData = sortDirection === 'asc' ? cloneData : cloneData.reverse();
        this.sortedBy = sortedBy;
        this.sortedDirection = sortDirection;
    }

    connectedCallback(){
        this.columns = JSON.parse(this.columns);
        this.recordData = JSON.parse(this.recordData);
        if(this.recordData.length > 1){
            this.columns.forEach(column => {
                column.sortable = true;
            });
        }
    }

    handleGoToRecord() {
        // Use NavigationMixin to navigate to the record page
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.recordId,
                actionName: 'view'
            }
        });
    }

    handleGoToObject(event) {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: this.objectApiName,
                actionName: 'list'
            },
            state: {
                filterName: '__Recent'
            }
        });
    } 
}