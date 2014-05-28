/*global WordCloudApp, angular, iLanguageCloud */
'use strict';

/**
 * The main controller for the app. The controller:
 * - retrieves and persists the model via the wordCloudStorage service
 * - exposes the model to the template and provides event handlers
 */
WordCloudApp.controller('WordCloudCtrl', function WordCloudCtrl($scope, $location, $filter, wordCloudStorage) {
  var wordClouds = $scope.wordClouds = [];
  var sparePartsCloud = new iLanguageCloud();

  // If there is saved data in storage, use it.
  // https://developer.chrome.com/apps/app_codelab5_data
  $scope.load = function(value) {
    if (value) {
      wordClouds = $scope.wordClouds = value;
      $scope.remainingCount = $filter('filter')(wordClouds, {
        archived: false
      }).length;
    }
  };

  /* http://stackoverflow.com/questions/15310935/angularjs-extend-recursive */
  $scope.extendDeep = function extendDeep(dst) {
    angular.forEach(arguments, function(obj) {
      if (obj !== dst) {
        angular.forEach(obj, function(value, key) {
          if (dst[key] && dst[key].constructor && dst[key].constructor === Object) {
            extendDeep(dst[key], value);
          } else {
            dst[key] = value;
          }
        });
      }
    });
    return dst;
  };

  wordCloudStorage.get(function(wordClouds) {
    console.log('Got some wordClouds', wordClouds);
    $scope.$apply(function() {
      $scope.load(wordClouds);
    });
  });

  $scope.newWordCloud = '';
  $scope.remainingCount = 0;
  $scope.editedWordCloud = null;

  if ($location.path() === '') {
    $location.path('/');
  }

  $scope.location = $location;

  $scope.$watch('location.path()', function(path) {
    $scope.statusFilter = {
      '/active': {
        archived: false
      },
      '/archived': {
        archived: true
      }
    }[path];
  });

  $scope.$watch('remainingCount == 0', function(val) {
    $scope.allChecked = val;
  });

  $scope.addWordCloud = function() {
    var newWordCloud = $scope.newWordCloud.trim();
    if (newWordCloud.length === 0) {
      return;
    }
    var cloudToSave = new iLanguageCloud({
      orthography: newWordCloud,
      archived: false,
      height: 200,
      nonContentWordsArray: [],
      prefixesArray: [], // |სა-, სტა-,იმის,-ში/
      suffixesArray: [],
      punctuationArray: [],
      wordFrequencies: [],
      collection: 'datums',
      lexicalExperience: {},
      url: wordCloudStorage.dbUrl()
    });

    /* make the longer texts have more vertical space */
    if (cloudToSave.orthography && cloudToSave.orthography.length > 300) {
      cloudToSave.height = 400;
    } else {
      cloudToSave.height = 200;
    }

    /* Create a title if not present */
    if (!cloudToSave.title && cloudToSave.orthography) {
      var titleLength = cloudToSave.orthography.length > 31 ? 30 : cloudToSave.orthography.length - 1;
      cloudToSave.title = cloudToSave.orthography.substring(0, titleLength) + '...';
    }

    wordClouds.push(cloudToSave);
    cloudToSave.save();

    $scope.newWordCloud = '';
    $scope.remainingCount++;
  };

  $scope.editWordCloud = function(wordCloud) {
    $scope.editedWordCloud = wordCloud;
    // Clone the original wordCloud to restore it on demand.
    $scope.originalWordCloud = $scope.extendDeep({}, wordCloud);
  };

  $scope.doneEditing = function(wordCloud) {
    $scope.editedWordCloud = null;
    wordCloud.orthography = wordCloud.orthography.trim();

    if (!wordCloud.orthography) {
      $scope.removeWordCloud(wordCloud);
    } else {
      wordCloud.save();
    }
  };

  $scope.revertEditing = function(wordCloud) {
    wordClouds[wordClouds.indexOf(wordCloud)] = $scope.originalWordCloud;
    $scope.doneEditing($scope.originalWordCloud);
  };

  $scope.removeWordCloud = function(wordCloud) {
    wordCloud.trashed = 'deleted';
    $scope.remainingCount -= wordCloud.archived ? 0 : 1;
    wordClouds.splice(wordClouds.indexOf(wordCloud), 1);
    wordCloud.save();
  };

  $scope.wordCloudArchived = function(wordCloud) {
    $scope.remainingCount += wordCloud.archived ? -1 : 1;
    wordCloud.save();
  };

  $scope.clearArchivedWordClouds = function() {
    $scope.wordClouds = wordClouds = wordClouds.filter(function(wordCloud) {
      if (wordCloud.archived) {
        wordCloud.trashed = 'deleted';
        wordCloud.save();
      }
      return !wordCloud.archived;
    });
  };

  $scope.markAll = function(archived) {
    wordClouds.forEach(function(wordCloud) {
      wordCloud.archived = !archived;
      wordCloud.save();
    });
    $scope.remainingCount = archived ? wordClouds.length : 0;
  };
});
