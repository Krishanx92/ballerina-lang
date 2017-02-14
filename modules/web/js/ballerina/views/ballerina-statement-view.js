/**
 * Copyright (c) 2016, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
define(['require', 'lodash', 'log', './../visitors/statement-visitor', 'd3', 'd3utils', 'property_pane_utils', './point', './bounding-box', 'expression_editor_utils'],
    function (require, _, log, StatementVisitor, d3, D3Utils, PropertyPaneUtils, Point, BBox, expressionEditor) {

    /**
     * A common class which consists functions of moving or resizing views.
     * @constructor
     */
    var BallerinaStatementView = function (args) {
        StatementVisitor.call(this, args);
        this._parent = _.get(args, "parent");
        this._model = _.get(args, "model");
        this._container = _.get(args, "container");
        this._viewOptions = _.get(args, "viewOptions");
        this.toolPalette = _.get(args, "toolPalette");
        this.messageManager = _.get(args, "messageManager");
        this._statementGroup = undefined;
        this._childrenViewsList = [];
        if (!_.has(args, 'topCenter')) {
            log.warn('topCenter has not defined. Default top center will be created');
        }
        this._topCenter = _.has(args, "topCenter") ? _.get(args, 'topCenter').clone() : new Point(0,0);
        this._bottomCenter = _.has(args, "bottomCenter") ? _.get(args, 'bottomCenter').clone() : new Point(0,0);
        this._boundingBox = new  BBox();
        this._isEditControlsActive = false;
        var self = this;
        this._topCenter.on("moved", function(offset){
            self._bottomCenter(offset.dx, offset.dy);
        });
        this.init();
    };

    BallerinaStatementView.prototype = Object.create(StatementVisitor.prototype);
    BallerinaStatementView.prototype.constructor = BallerinaStatementView;

    BallerinaStatementView.prototype.init = function(){
        //Registering event listeners
        this._parent.on('changeStatementMetricsEvent', this.changeMetricsCallback, this);
        this._model.on('child-removed', this.childRemovedCallback, this);
        this._model.on('before-remove', this.onBeforeModelRemove, this);
    };

    /**
     * Remove statement view callback
     * @param {ASTNode} parent - Parent model
     * @param {ASTNode} child - child model
     */
    BallerinaStatementView.prototype.onBeforeModelRemove = function () {
        d3.select("#_" +this._model.id).remove();
        // resize the bounding box in order to the other objects to resize
        this.getBoundingBox().h(0).w(0);
    };

    /**
     * Child remove callback
     * @param {ASTNode} child - removed child
     */
    BallerinaStatementView.prototype.childRemovedCallback = function (child) {
    };

    BallerinaStatementView.prototype.setParent = function (parent) {
        this._parent = parent;
    };
    BallerinaStatementView.prototype.getParent = function () {
        return this._parent;
    };

    BallerinaStatementView.prototype.getStatementGroup = function () {
        return this._statementGroup;
    };

    /**
     * Sets the statement group of this view.
     * @param statementGroup {object} statement group to be set
     */
    BallerinaStatementView.prototype.setStatementGroup = function (statementGroup) {
        this._statementGroup = statementGroup;
    };

    BallerinaStatementView.prototype.getChildrenViewsList = function () {
        return this._childrenViewsList;
    };
    BallerinaStatementView.prototype.changeWidth = function (dw) {
    };
    BallerinaStatementView.prototype.changeHeight = function (dh) {
    };
    BallerinaStatementView.prototype.changeMetricsCallback = function (baseMetrics) {
    };
    BallerinaStatementView.prototype.getDiagramRenderingContext = function () {
        return this._diagramRenderingContext;
    };

    BallerinaStatementView.prototype.renderEditView = function (editableProperties, statementGroup, viewOptions) {
        var self = this;

        // Get the bounding box of the if else view.
        var statementBoundingBox = self.getBoundingBox();

        // Calculating width for edit and delete button.
        var propertyButtonPaneRectWidth = viewOptions.actionButton.width;

        // Creating an SVG group for the edit and delete buttons.
        var propertyButtonPaneGroup = D3Utils.group(statementGroup);

        // Delete button pane group
        var deleteButtonPaneGroup = D3Utils.group(statementGroup);

        // Adding svg definitions needed for styling delete button.
        var svgDefinitions = deleteButtonPaneGroup.append("defs");

        var deleteButtonPattern = svgDefinitions.append("pattern")
            .attr("id", "deleteIcon")
            .attr("width", "100%")
            .attr("height", "100%");

        deleteButtonPattern.append("image")
            .attr("xlink:href", "images/delete.svg")
            .attr("x", (viewOptions.actionButton.width) - (36 / 2))
            .attr("y", (viewOptions.actionButton.height / 2) - (14 / 2))
            .attr("width", "14")
            .attr("height", "14");

        // Bottom center point.

        var centerPointX = statementBoundingBox.x()+ (statementBoundingBox.w() / 2);
        var centerPointY = statementBoundingBox.y()+ statementBoundingBox.h();

        var smallArrowPoints =
            // Bottom point of the polygon.
            " " + centerPointX + "," + centerPointY +
                // Left point of the polygon
            " " + (centerPointX - 3) + "," + (centerPointY + 3) +
                // Right point of the polygon.
            " " + (centerPointX + 3) + "," + (centerPointY + 3);

        var smallArrow = D3Utils.polygon(smallArrowPoints, statementGroup);

        // Creating the action button pane border.
        var propertyButtonPaneRect = D3Utils.rect(centerPointX - (propertyButtonPaneRectWidth / 2), centerPointY + 3,
            propertyButtonPaneRectWidth, viewOptions.actionButton.height, 0, 0, deleteButtonPaneGroup)
            .classed(viewOptions.actionButton.wrapper.class, true);

        // Not allowing to click background elements.
        $(propertyButtonPaneRect.node()).click(function(event){
            event.stopPropagation();
        });

        // Creating the edit action button.
        var deleteButtonRect = D3Utils.rect(centerPointX - (propertyButtonPaneRectWidth / 2), centerPointY + 3,
            propertyButtonPaneRectWidth, viewOptions.actionButton.height, 0, 0, deleteButtonPaneGroup)
            .classed(viewOptions.actionButton.class, true).classed(viewOptions.actionButton.deleteClass, true);

        // 175 is the width set in css
        var propertyPaneWrapper = $("<div/>", {
            class: viewOptions.propertyForm.wrapper.class,
            css: {
                "width": (statementBoundingBox.w() + 1), // Making the text box bit bigger than the statement box
                "height": 32 // Height for the expression editor box.
            },
            click: function (event) {
                event.stopPropagation();
            }
        }).offset({
            top: (statementBoundingBox.y() - 1), // Adding the textbox bit bigger than the statement box.
            left: (statementBoundingBox.x() - 1)
        }).appendTo(propertyButtonPaneGroup.node().ownerSVGElement.parentElement);


        // Div which contains the form for the properties.
        var propertyPaneBody = $("<div/>", {
            "class": viewOptions.propertyForm.body.class
        }).appendTo(propertyPaneWrapper);

        expressionEditor.createEditor(propertyPaneBody,
            viewOptions.propertyForm.body.property.wrapper, editableProperties);

        $(deleteButtonRect.node()).click(function(event){
            event.stopPropagation();
            self._model.remove();
            self.trigger('edit-mode-disabled');
            $(statementGroup).remove();
        });

        this._isEditControlsActive = true;

        this.once('edit-mode-disabled', function(){
            $(propertyPaneWrapper).remove();
            $(propertyButtonPaneGroup.node()).remove();
            $(deleteButtonPaneGroup.node()).remove();
            $(smallArrow.node()).remove();
            this._isEditControlsActive = false;
        })

    };

    BallerinaStatementView.prototype._createPropertyPane = function (args) {
        var viewOptions = _.get(args, "viewOptions", {});
        var statementGroup = _.get(args, "statementGroup", null);
        var editableProperties = _.get(args, "editableProperties", []);

        viewOptions.actionButton = _.get(args, "viewOptions.actionButton", {});
        viewOptions.actionButton.class = _.get(args, "actionButton.class", "property-pane-action-button");
        viewOptions.actionButton.wrapper = _.get(args, "actionButton.wrapper", {});
        viewOptions.actionButton.wrapper.class = _.get(args, "actionButton.wrapper.class", "property-pane-action-button-wrapper");
        viewOptions.actionButton.disableClass = _.get(args, "viewOptions.actionButton.disableClass", "property-pane-action-button-disable");
        viewOptions.actionButton.deleteClass = _.get(args, "viewOptions.actionButton.deleteClass", "property-pane-action-button-delete");

        viewOptions.actionButton.width = _.get(args, "viewOptions.action.button.width", 22);
        viewOptions.actionButton.height = _.get(args, "viewOptions.action.button.height", 22);

        viewOptions.propertyForm = _.get(args, "propertyForm", {});
        viewOptions.propertyForm.wrapper = _.get(args, "propertyForm.wrapper", {});
        viewOptions.propertyForm.wrapper.class = _.get(args, "propertyForm.wrapper", "expression-editor-form-wrapper");
        viewOptions.propertyForm.heading = _.get(args, "propertyForm.heading", {});
        viewOptions.propertyForm.body = _.get(args, "propertyForm.body", {});
        viewOptions.propertyForm.body.class = _.get(args, "propertyForm.body.class", "expression-editor-form-body");
        viewOptions.propertyForm.body.property = _.get(args, "propertyForm.body.property", {});
        viewOptions.propertyForm.body.property.wrapper = _.get(args, "propertyForm.body.property.wrapper",
            "expression-editor-form-body-property-wrapper");

        var self = this;
        $(statementGroup.node()).click(function (event) {
            self.trigger('edit-mode-enabled');
            event.stopPropagation();
            $(window).click(function (event) {
                self.trigger('edit-mode-disabled');
                $(this).unbind("click");
            });
        });

        this.on('edit-mode-enabled', function() {
            // already in edit mode
            if(self._isEditControlsActive){
                return;
            }
            self.renderEditView(editableProperties, statementGroup, viewOptions);
        });
    };


    BallerinaStatementView.prototype.getTopCenter = function () {
        return this._topCenter;
    };

    BallerinaStatementView.prototype.getViewOptions = function () {
        return this._viewOptions;
    };

    /**
     * Returns the bounding box of this view.
     * @return {BBox}
     */
    BallerinaStatementView.prototype.getBoundingBox = function () {
        return this._boundingBox;
    };

    BallerinaStatementView.prototype.repositionStatement = function (options) {
        this.getBoundingBox().y(this.getBoundingBox().y() + options.dy);
        this.getStatementGroup().attr('transform', ('translate(0,' + options.dy + ')'));
    };

    /**
     * Set the diagram rendering context
     * @param {object} diagramRenderingContext
     */
    BallerinaStatementView.prototype.setDiagramRenderingContext = function (diagramRenderingContext) {
        this._diagramRenderingContext = diagramRenderingContext;
    };

    return BallerinaStatementView;
});
