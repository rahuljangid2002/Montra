import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import quickLeadCapture from '@salesforce/apex/LeadControllerForBypassDuplicateRule.quickLeadCapture';
import getRelatedDseAndDealership from '@salesforce/apex/UtilWithoutSharing.getRelatedDseAndDealership';
import sendNotification from '@salesforce/apex/LeadControllerForBypassDuplicateRule.sendNotification';
import getDseAccount from '@salesforce/apex/CurrentUserProfileController.getDseAccount';
import isSalesKAMUser from '@salesforce/apex/CurrentUserProfileController.isSalesKAMUser';

import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import LEAD_OBJECT from '@salesforce/schema/Lead'
import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import LEAD_SOURCE from '@salesforce/schema/Lead.LeadSource'
import LEAD_SUB_SOURCE from '@salesforce/schema/Lead.Sub_Source__c'

export default class QuickLeadCapture extends NavigationMixin(LightningElement) {
    @track isDuplicateWarningShown = false;
    @track MobilePhone = '';
    @track isKAM = false;
    @track isDse = false;
    @track isNameShow = true;
    @track lastNameIfInstitutional = '';
    @track isEmailShow = false;
    isLoading = true;
    connectedCallback() {
        this.isDuplicateWarningShown = false;
        this.checkIfKAMUser();
        this.getDSEAccountDetails();
    }
    @wire(getObjectInfo, { objectApiName: LEAD_OBJECT }) leadInfo;

    @track showModal = false;
    @track dealership = '';
    @track leadSourceOptions;
    @track leadSubSourceOptions = [{ label: '--None--', value: '' }];
    @track leadSubSourceData = [{ label: '--None--', value: '' }];
    leadId = '';
    leadName = '';
    recipientId = '';
    district = '';
    state = '';
    leadOwnerId = '';
    selectedSourceValue = 'Showroom Walkin';
    isReferralSource = false;
    isPortalUser = false;
    @track leadTypeOption = [{ label: 'Retail', value: 'Retail' }, { label: 'Institutional', value: 'Institutional' }];

    @wire(getPicklistValues, { recordTypeId: '$leadInfo.data.defaultRecordTypeId', fieldApiName: LEAD_SUB_SOURCE })
    leadSubSourceData({ error, data }) {
        if (data) {
            console.log('leadSubSourceData: ' + JSON.stringify(data.values));

            this.leadSubSourceData = data;
        } else {
            this.showToast('Error', error?.body?.message ?? 'An issue has occurred, Contact your system administrator', 'error');
        }
    }
    @wire(getPicklistValues, { recordTypeId: '$leadInfo.data.defaultRecordTypeId', fieldApiName: LEAD_SOURCE })
    leadSourceData({ error, data }) {
        if (data) {
            console.log('is portal enabled', this.isPortalUser);
            console.log('lead Sourc eData: ' + JSON.stringify(data));
            console.log('is portal enabled wire method', this.isPortalUser);
            if (this.isPortalUser) {
                this.leadSourceOptions = [{ label: '--None--', value: '' }, { label: 'Showroom Walkin', value: 'Showroom Walkin' }, { label: 'Referral', value: 'Referral' }, { label: 'Field', value: 'Field' }];
            } else {
                this.leadSourceOptions = [{ label: '--None--', value: '' }, ...data.values];

            }

        }
    }
    get disableSubSource() {
        return (this.leadSubSourceOptions.length == 1);
    }
    handleSourceChange(event) {
        console.log('lead sub source data ->>', JSON.stringify(this.leadSubSourceData));
        const value = event.target.data;
        if (value == '') {
            this.leadSubSourceOptions = [{ label: '--None--', value: '' }];
        } else {
            const key = this.leadSubSourceData.controllerValues[event.target.value];
            this.leadSubSourceOptions = this.leadSubSourceData.values.filter(item => item.validFor.includes(key));
            this.leadSubSourceOptions.unshift({ label: '--None--', value: '' });
        }
        this.template.querySelector('lightning-input-field[data-id="LeadSource"]').value = event.target.value;

        if (event.target.value === 'Referral') {
            this.isReferralSource = true;
        } else {
            this.isReferralSource = false;
        }
    }
    handleSubSourceChange(event) {
        const ele = this.template.querySelector('lightning-input-field[data-id="LeadSubSource"]')
        ele.value = event.target.value;
        console.log(this.template.querySelector('lightning-input-field[data-id="LeadSubSource"]').value)
    }


    checkIfKAMUser() {
        this.isLoading = true;
        isSalesKAMUser()
            .then(result => {
                console.log(result);
                this.isPortalUser = result.isPortalUser;
                this.isKAM = result.isKAM;
                this.isNameShow = !result.isKAM;
                this.isDse = result.isDse;
                console.log(result);
                console.log('is portal enabled', this.isPortalUser);

                // if (this.isPortalUser) {
                //     this.leadSourceOptions = [{ label: 'Showroom Walkin', value: 'Showroom Walkin' }, { label: 'Referral', value: 'Referral' }, { label: 'Field', value: 'Field' }];
                // } else {
                //     this.leadSourceOptions = data?.values;
                // }
                this.isLoading = false;

            })
            .catch(error => {
                console.error('Error checking user role:', error);
                this.isLoading = false;

            });
    }

    getDSEAccountDetails(){
        getDseAccount()
        .then((result) => {
            this.district = result[0]==null?'':result[0];
            this.state = result[1]==null?'':result[1];
        }).catch((err) => {
            console.log('Error in getting District And State'+err);
        });
    }

    handleSuccess(event) {
        try {
            this.showToast('Success', 'Lead created successfully!', 'success');
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: event.detail.id,
                        objectApiName: 'Lead',
                        actionName: 'view',
                    },
                });
            this.isLoading = false;
        } catch (e) {
            this.closeQuickAction();
            this.isLoading = false;
        }
    }

    handleLeadTypeChange(event) {
        const leadType = event.target.value;
        if (leadType == 'Institutional') {
            this.isNameShow = false;
            this.isEmailShow = true;
        }
        else if (leadType == 'Dealer') {
            this.isNameShow = true;
            this.isEmailShow = true;
        }
        else {
            this.isNameShow = true;
            this.isEmailShow = false;
        }
        this.template.querySelector('lightning-input-field[data-id="Lead_Type__c"]').value = leadType;
    }

    handleLastNameIfInstitutional(event) {
        this.lastNameIfInstitutional = event.target.value;
        const lastNameField = this.template.querySelector('[data-id="LastName"]');
        if (lastNameField) {
            lastNameField.value = this.lastNameIfInstitutional; // Update hidden LastName field
        }
    }

    handlePromptSubmit() {
        console.log('In event');
        sendNotification({ userIds: this.leadOwnerId, title: 'Lead Revival', body: 'Start nurturing this lead again : ' + this.leadName, targetRecordId: this.leadId })
            .then(() => {
                console.log('In Then');
                this.showToast('Success', 'Notification sent!', 'success');
                this.showModal = false;
                this.closeQuickAction();
            })
            .catch((error) => {
                this.showToast('Error', error?.body?.message ?? 'Notification not sent', 'error');
            });
    }



    handleError(event) {
        this.isLoading = false;
        this.showModal = false;
        console.log(JSON.stringify(event.detail));
        event.preventDefault();

        if (!this.isDuplicateWarningShown || this.MobilePhone != this.template.querySelector('[data-id="MobilePhone"]').value) {
            if (event.detail.detail.includes('duplicate record')) {
                console.log('In iffffffffffffffffffffff');
                this.MobilePhone = this.template.querySelector('[data-id="MobilePhone"]').value;
                if (this.MobilePhone != null && this.MobilePhone != '') {
                    getRelatedDseAndDealership({ mobile: this.MobilePhone })
                        .then(result => {
                            if (result.includes('Lead or Owner not found')) {
                                this.isDuplicateWarningShown = true;
                                this.showToast('Warning', 'You\'re creating a duplicate record.', 'warning');
                            }
                            else {
                                console.log('In eld\s      ', JSON.stringify(result));
                                this.isDuplicateWarningShown = false;
                                // this.dseName = result[0];
                                this.dealership = result[1];
                                this.leadId = result[2];
                                this.leadName = result[3];
                                this.leadOwnerId = result[4];
                                this.showModal = true;
                            }
                        })
                        .catch(error => {
                            this.showModal = false;
                        });
                }
            } else if(event.detail.message.includes('requested resource does not exist')){
                this.closeQuickAction();
                this.showToast('Success', 'Lead created successfully!', 'success');
            } else {
                this.showToast('Error', event.detail.detail, 'error');
            }
        }

        else {
            let name;
            let company;
            const lastNameElement = this.template.querySelector('[data-id="LastName"]');
            const companyNameElement = this.template.querySelector('[data-id="Company_Name__c"]');
            const firstNameElement = this.template.querySelector('[data-id="FirstName"]');
            const emailElement = this.template.querySelector('[data-id="Email"]');
            const mobilePhoneElement = this.template.querySelector('[data-id="MobilePhone"]');
            const leadTypeElement = this.template.querySelector('[data-id="Lead_Type__c"]');
            const streetElement = this.template.querySelector('[data-id="State2__c"]');
            const districtElement = this.template.querySelector('[data-id="District2__c"]');
            // const postalCodeElement = this.template.querySelector('[data-id="PostalCode"]');
            // const residenceStateElement = this.template.querySelector('[data-id="Residence_State__c"]');
            const LeadSource = this.template.querySelector('[data-id="LeadSource"]');
            const LeadSubSource = this.template.querySelector('[data-id="LeadSubSource"]');
            const Interested_In_Buying = this.template.querySelector('[data-id="Interested_In_Buying"]');
            const Referral_Phone_Number = this.template.querySelector('[data-id="Referral_Phone_Number"]');

            if (this.isNameShow) {
                name = lastNameElement ? lastNameElement.value : '';
                company = null;
            }
            else {
                name = this.template.querySelector('[data-id="key-person"]').value;
                company = companyNameElement ? companyNameElement.value : '';
            }
            console.log(name);
            const fields = {
                Status: 'New',
                LeadSource: 'Showroom Walkin',
                Country: 'India',
                FirstName: firstNameElement ? firstNameElement.value : '',
                LastName: name,
                Email: emailElement ? emailElement.value : '',
                MobilePhone: mobilePhoneElement ? mobilePhoneElement.value : '',
                Lead_Type__c: leadTypeElement ? leadTypeElement.value : '',
                Street: streetElement ? streetElement.value : '',
                District2__c: districtElement ? districtElement.value : '',
                PostalCode: postalCodeElement ? postalCodeElement.value : '',
                Company_Name__c: company,
                State2__c: residenceStateElement ? residenceStateElement.value : '',
                LeadSource: LeadSource ? LeadSource.value : '',
                Sub_Source__c: LeadSubSource ? LeadSubSource.value : '',
                Interested_In_Buying__c: Interested_In_Buying ? Interested_In_Buying.value : '',
                Referral_Phone_Number__c: Referral_Phone_Number ? Referral_Phone_Number.value : ''
            };
            this.isLoading = true;

            quickLeadCapture({ newLead: fields })
                .then((leadId) => {

                    this.showToast('Success', 'Lead created successfully!', 'success');
                    this[NavigationMixin.Navigate]({
                        type: 'standard__recordPage',
                        attributes: {
                            recordId: leadId,
                            objectApiName: 'Lead',
                            actionName: 'view',
                        },
                    });
                    this.isLoading = false;
                })
                .catch((error) => {
                    this.isLoading = false;
                    this.showToast('Error', error?.body?.message ?? 'Error while creating Lead. Please try again.', 'error');
                });
        }
    }
    handleSubmit() {
        this.isLoading = true;
    }

    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(evt);
    }

    closeQuickAction() {
        this.showModal = false;
        const isCommunity = window.location.pathname.includes('/s/');
        if (isCommunity) {
            this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: {
                    url: '/lead/Lead/Default'
                }
            });
        } else {
            this[NavigationMixin.Navigate]({
                type: 'standard__objectPage',
                attributes: {
                    objectApiName: 'Lead',
                    actionName: 'list'
                },
                state: {
                    filterName: 'AllOpenLeads'
                }
            });
        }
    }

}