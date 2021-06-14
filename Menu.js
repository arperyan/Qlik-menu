define(["qlik", "jquery", "text!./style.css"], function (qlik, $, cssContent) {
  "use strict";
  $("<style>").html(cssContent).appendTo("head");

  let app = qlik.currApp(this);

  function getMasterObjects() {
    return new Promise(function (resolve, reject) {
      app.getList("masterobject").then(function (model) {
        app.destroySessionObject(model.layout.qInfo.qId);

        if (!model.layout.qAppObjectList || !model.layout.qAppObjectList.qItems)
          return resolve({
            value: "",
            label: "No Fields",
          });

        return resolve(
          model.layout.qAppObjectList.qItems.map(function (item) {
            if (item.qData.visualization === "filterpane") {
              return {
                value: item.qInfo.qId + "~" + item.qMeta.title,
                label: item.qMeta.title,
                visualization: item.qData.visualization,
              };
            }
          })
        );
      });
    });
  }

  let itemSection = {
    ref: "objectlist",
    label: "Data",
    type: "items",
    items: {
      objects: {
        type: "array",
        ref: "listItems",
        label: "Objects",
        itemTitleRef: function (masterItem) {
          return masterItem.masterItem.split("~")[1];
        },
        allowAdd: true,
        allowRemove: true,
        max: 15,
        addTranslation: "Add Filter",
        items: {
          obj: {
            label: "Master Item",
            component: "dropdown",
            type: "array",
            ref: "masterItem",
            defaultValue: "",
            options: function () {
              return getMasterObjects().then(function (items) {
                return items;
              });
            },
          },
        },
      },
    },
  };

  let about = {
    type: "items",
    label: "About",
    items: {
      about: {
        component: {
          template:
            '<p style="font-size:14px; color: #7f7f7f; text-align:left; padding-top: 10px;"><i>Created by: Ryan Arpe</i>',
        },
      },
    },
  };

  return {
    support: {
      snapshot: false,
      export: false,
      exportData: false,
    },
    initialProperties: {
      listItems: [],
    },
    definition: {
      type: "items",
      component: "accordion",
      items: {
        data: {
          type: "items",
          label: "Data",
          items: {
            list: itemSection,
          },
        },
        settings: {
          uses: "settings",
          items: {
            about: about,
          },
        },
      },
    },
    paint: function ($element, layout) {
      var html,
        tid = $element
          .parent()
          .parent()
          .parent()
          .parent()
          .parent()
          .parent()
          .parent()
          .parent()
          .attr("tid");

      html = `<div id="qv-menu-navigation" class="qv-menu-overlay">
          <div class="qv-menu-title-container">
            <h1 class="qv-menu-title">Filters</h1>
            <a href="javascript:void(0)" id="qv-menu-close-button" class="qv-menu-closebtn">&times;</a>
          </div>
          <div id="qv-menu-content" class="qv-menu-overlay-content"></div>
        </div>
        <span id="qv-menu-icon-filter" title="filter">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            aria-hidden="true"
            focusable="false"
            width="2rem"
            height="2rem"
            style="-ms-transform: rotate(360deg); -webkit-transform: rotate(360deg); transform: rotate(360deg);cursor: pointer;"
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 24 24"
          >
            <path
              d="M14 12v7.88c.04.3-.06.62-.29.83a.996.996 0 0 1-1.41 0l-2.01-2.01a.989.989 0 0 1-.29-.83V12h-.03L4.21 4.62a1 1 0 0 1 .17-1.4c.19-.14.4-.22.62-.22h14c.22 0 .43.08.62.22a1 1 0 0 1 .17 1.4L14.03 12H14z"
              fill="#fdfdfd"
            />
          </svg>
        </span>`;
      $element.html(html);

      let myIcon = document.getElementById("qv-menu-icon-filter"),
        myNav = document.getElementById("qv-menu-navigation"),
        myClose = document.getElementById("qv-menu-close-button"),
        myTid = document.querySelector(`div[tid=${tid}]`),
        myMenu = document.getElementById("qv-menu-content");

      // Adding zindex to the tId
      myTid.style.zIndex = 10;

      // Creating the filter objects
      const createMyFieldFilter = async (app) => {
        await Promise.all(
          layout.listItems.map(async (listItem, i) => {
            myMenu.insertAdjacentHTML(
              "beforeend",
              `<div class="qv-menu-filterpane-container">
              <div id="${
                layout.qInfo.qId + i
              }" class="qv-menu-filterpane"></div>
            </div>`
            );
            await app.getObject(
              layout.qInfo.qId + i,
              listItem.masterItem.split("~")[0]
            );
          })
        );
      };

      // Check if not in edit mode
      if (qlik.navigation.getMode() !== "edit") {
        // OPen the filter icon
        myIcon.addEventListener("click", async (e) => {
          // Not outside click
          layout.listItems.length === 0
            ? myMenu.insertAdjacentHTML(
                "afterbegin",
                `<h1 class="qv-menu-add-filter">Add Filters</h1>`
              )
            : "";
          // Adding the spinner by inserting after the menu overlay
          myMenu.insertAdjacentHTML(
            "afterbegin",
            `<div id="qv-menu-spinner" class="spinner-overlay"><div class="spinner-container"/></div>`
          );

          await createMyFieldFilter(app);

          myNav.style.width = "18%";
          myMenu.style.display = "flex";

          // Remove spinnner once all object have been rendered
          setTimeout(() => {
            document.getElementById("qv-menu-spinner").remove();
          }, 600);
          // }
        });
      }

      // Close the filter pane

      myClose.addEventListener("click", () => {
        myNav.style.width = "0";

        setTimeout(() => {
          // Empty the children
          while (myMenu.firstChild) {
            myMenu.removeChild(myMenu.firstChild);
          }
          myMenu.style.display = "none";
        }, 150);
      });

      return qlik.Promise.resolve();
    },
  };
});

//Accordion style
// var acc = document.getElementsByClassName("accordion");
//       var panel = document.getElementsByClassName("panel");

//       for (var i = 0; i < acc.length; i++) {
//         acc[i].onclick = function () {
//           var setClasses = !this.classList.contains("active");
//           createMyFieldFilter(app, setClasses);
//           setClass(acc, "active", "remove");
//           setClass(panel, "show", "remove");
//           if (setClasses) {
//             this.classList.toggle("active");
//             this.nextElementSibling.classList.toggle("show");
//           }
//         };
//       }

//       function setClass(els, className, fnName) {
//         for (var i = 0; i < els.length; i++) {
//           els[i].classList[fnName](className);
//         }
//       }
