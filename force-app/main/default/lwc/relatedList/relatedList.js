import { LightningElement, api, track } from 'lwc';
import fetchRecord from '@salesforce/apex/RelatedRecordListHandler.fetchRecord';
import { NavigationMixin } from "lightning/navigation";

export default class RelatedList extends NavigationMixin(LightningElement) {
    @track columns = [];
    @api ChildObjectName;
    @api recordId;
    @api emptyListMessage = 'Related Records Not Found';
    @api StandardIconName;
    @api Title;
    @api FieldSetName;
    @api objectApiName;
    @api numberOfElements = 0;
    @track data = [];
    @track allRecords = [];
    @track showSpinner = false;
    @track message = 'Loading...';
    @track showErrormessage = false;
    @track totalNumberOfRecords = 0;
    @track showTable = false;
    @track sortedBy;
    @track sortedDirection = 'asc';

    connectedCallback() {
        if(this.numberOfElements < 1){
            this.numberOfElements = 5;
        }
        this.StandardIconName = 'standard:' + (this.StandardIconName != null && this.StandardIconName != undefined ? this.StandardIconName : 'related_list');
        setTimeout(() => {
            this.showSpinner = true;
            this.relatedrecord();
        }, 100);

    }

    relatedrecord() {
        fetchRecord({ ChildObjectName: this.ChildObjectName, RecordId: this.recordId, FieldSetName: this.FieldSetName })
            .then((result) => {
                result = JSON.parse(result);
                if (result.statusCode == 200) {
                    this.showTable = true;
                    var tempData = JSON.parse(result.Data);
                    this.totalNumberOfRecords = tempData.length;
                    var tempColumn = JSON.parse(result.fields);
                    var columnInside = [];
                    var flag = false;
                    tempColumn.forEach(currentItem => {
                        if (currentItem.name.toLowerCase() === 'subject') {
                            flag = true;
                            columnInside.push({
                                label: currentItem.label,
                                fieldName: 'nameUrl',
                                type: 'url', initialWidth: 180,
                                typeAttributes: {
                                    label: { fieldName: currentItem.name },
                                    target: '_blank'
                                },
                                sortable: this.numberOfElements > 1 ? true : false
                            });
                        }else {
                            columnInside.push({ label: currentItem.label, fieldName: currentItem.name, sortable: this.numberOfElements > 1 ? true : false })
                        }
                    });
                    if (flag && tempData) {
                        this.data = tempData.map(record => {
                            return {
                                ...record,
                                nameUrl: '/' + record.Id // Create URL for the name field
                            };
                        });
                    }
                    this.allRecords = JSON.stringify(this.data);
                    this.data = this.data.slice(0, this.numberOfElements);
                    this.columns = columnInside;
                    this.showErrormessage = false;
                } else if (result.statusCode == 400) {
                    this.showErrormessage = true;
                    this.message = 'Something Went Wrong';
                    console.error('Error : ', result.errorMessage)
                }else if (result.statusCode == 404) {
                    this.showErrormessage = true;
                    if(result.errorMessage == 'Records List is Empty'){
                        this.message = this.emptyListMessage;
                    }else{
                        this.message = result.errorMessage;
                    }
                }
            }).catch((err) => {
                console.error('Error : ', err);
                console.error('Error Message : ', err.message);
            }).finally(() => {
                this.showSpinner = false;
            })
    }

    handleSort(event) {
        const { fieldName: sortedBy, sortDirection } = event.detail;
        const cloneData = [...this.data];

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

        this.data = sortDirection === 'asc' ? cloneData : cloneData.reverse();
        this.sortedBy = sortedBy;
        this.sortedDirection = sortDirection;
    }

    handleGotoRelatedList() {
        var compDefinition = {
            componentDef: "c:relatedListViewAllComponent",
            attributes: {
                columns: JSON.stringify(this.columns),
                recordData: this.allRecords,
                StandardIconName : this.StandardIconName,
                Title: this.Title,
                objectApiName: this.objectApiName,
                recordId: this.recordId
            }
        };
        // Base64 encode the compDefinition JS object
        var encodedCompDef = btoa(JSON.stringify(compDefinition));
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/one/one.app#' + encodedCompDef
            }
        }); 
    }
}