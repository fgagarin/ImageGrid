#=======================================================================

__version__ = '''0.0.01'''
__sub_version__ = '''20111110194648'''
__copyright__ = '''(c) Alex A. Naanou 2011'''


#-----------------------------------------------------------------------

import os
import json
import uuid

from itertools import izip, izip_longest

from pli.logictypes import ANY, OR

from pprint import pprint


#-----------------------------------------------------------------------

CONFIG_NAME = 'test_config.json'

config = json.load(open(CONFIG_NAME))

RAW = OR(
	'NEF', 'nef', 
	'CRW', 'crw',
	'CR2', 'cr2',
	'X3F', 'x3f'
)

JPEG = OR(
	'JPG', 'jpg', 
	'JPEG', 'jpeg'
)

PSD = OR(
	'PSD', 'psd'
)

TIFF = OR(
	'TIFF', 'tiff', 
	'TIF', 'tif'
)

XMP = OR(
	'XMP', 'xmp'
)

ITEM = OR(RAW, JPEG, PSD, TIFF, XMP)

TYPES = {
	'raw': RAW,
	'jpeg': JPEG,
	'psd': PSD,
	'tiff': TIFF,
	'xmp': XMP,
}


SUBTREE_CLASSES = {
	'preview': 'preview', 
	'preview (RAW)': 'RAW preview', 
}


#-----------------------------------------------------------------------

##!!! we will need to normalize the paths to one single scheme (either relative or absolute)...
def list_files(root, sub_trees=SUBTREE_CLASSES, type=ITEM):
	'''
	'''
	for path, dirs, files in os.walk(root):
		path = path.split(os.path.sep)
		# process files...
		for f in files:
			name, ext = os.path.splitext(f)
			# we need the extension wothout the dot...
			ext = ext[1:]
			# filter by ext...
			if ext == type:
				yield path, name, ext


# XXX need to split duplicate named raw files and corresponding
# 	  previews...
# XXX we are loosing the real extension here...
def index_by_name(file_list, types=TYPES.items()):
	'''
	format:
		{
			<name>: {
				<type>: [
					<path>,
					...
				],
				...
			},
			...
		}
	'''
	res = {}
	for path, name, ext in file_list:
		# normalize extension...
		orig_ext, ext = ext, types[types.index((ANY, ext))][0]
		if name not in res:
			# create a name...
			res[name] = {}
		if ext not in res[name]:
			# create an extension...
			res[name][ext] = []
		# general case...
##		res[name][ext] += [(path, name, ext)]
		res[name][ext] += [(path, orig_ext)]
##		res[name][ext] += [path]
	return res


# for this to work correctly it must:
# 	- return unique paths
# 	- non of the returnd paths can be a strict subset of any other...
##!!!
def split_common(paths):
	'''
	'''
	# pass 1: build list of common paths (None for all differences)
	# NOTE: we may have stray common path elements but we do
	# 		not care abut anything after a None...
	index = izip_longest(*paths)
	common = []
	for s in index:
		next = []
		for i in s:
			if s.count(i) > 1:
				next += [i]
			else:
				next += [None]
		common += [next]
	# pass 2: cap each common section with a unique element...
	common = [ list(e) for e in izip(*common)]
	for c, p in izip(common, paths):
		if None in c:
			i = c.index(None)
			if len(p) <= i:
				# NOTE: this is the case when we have a None 
				# 		because a path just ended... i.e. there 
				# 		was no different element to split at...
				# XXX do we need to break here?
				# XXX one way to go here is to simply ignore
				# 	  such paths...
				del c[i]
				continue
			# in-place update and truncate the common path...
			c[i] = p[i]
			del c[i+1:]
	return common

# in essance this need to replace image name with a GID and split up
# images that are identically named into seporate GIDs...
def split_images(index):
	'''
	This will split groups that contain multiple raw files.

	Groups are split to contain one raw each.

	Each image will be grouped to the raw that containse the ragest 
	matching sub-path, starting from root.

	Resulting groups will have a gid as it's key

	This will fail for any files that live in a common sub-path of any
	two or more raw files.


	NOTE: in the case there are two raw files in one path, then we will 
		  favor the deeper / longer mathch.
	'''
	for name, data in index.items():
		# this will not let us lose the name of the image...
		data['name'] = name
		raw = data['raw']
		if len(raw) > 1:
			# split the images...
			# split images via closeness to one of the raw files...
			# XXX the simple way to split files is to remove the
			# 	  common part of the path between two raw files and
			# 	  then split the other files by root of the
			# 	  subtree.
			# 	  this will not work in one case:
			# 	  	- at least two of the raw files are in a deeper
			# 	  	  subtree than the other accompanying files.
			# 	  	  in this case wa can not use the topology to
			# 	  	  decide which is wich and need either to use
			# 	  	  some other means or to go inside the image...
			#
			common = split_common([r for r, e in raw])

			# prepare the return structure...
			res = []
			for path in raw:
				##!!!
				res += [{
					'gid': uuid.uuid4(),
					'name': name,
					'raw': [path],
				}]
			# start splitting the data...
			for t, paths in data.items():
				# skip non-type fields...
				if t not in TYPES:
					continue
				if t == 'raw':
					continue
				# start the work...
				for path, ext in paths:
					matches = []
					for i, c in enumerate(common):
						# use matching path head to match targets...
						if path[:len(c)] == c:
							matches += [(len(c), i)]
					# multiple matches...
					if len(matches) > 1:
						# longest match wins...
						matches.sort(key=lambda e: e[0])
						if matches[0][0] == matches[1][0]:
							# XXX we could try and use a different
							# 	  strategy...
							##!!! do a better error...
							raise Exception, 'got two targets with same score, can\'t decide where to put the file.'
						del matches[1:]
					if len(matches) == 1:
						i = matches[0][1]
						# we found a location...
						if t not in res[i]:
							res[i][t] = []
						res[i][t] += [(path, ext)]
					else:
						##!!! XXX ungrouped files...
						raise Exception, 'still got ungrouped files...'

			# yield the results...
			for e in res:
				yield e['gid'], e
		else:
			gid = data['gid'] = uuid.uuid4()
			yield gid, data



#-----------------------------------------------------------------------
if __name__ == '__main__':
	lst = list(list_files(config['ARCHIVE_ROOT']))

	print len(lst)

	index = index_by_name(list_files(config['ARCHIVE_ROOT']))

	print len(index)

	json.dump(index, file(os.path.join('test', 'filelist.json'), 'w'))

	index = list(split_images(index_by_name(list_files(config['ARCHIVE_ROOT']))))

	print len(index)



#=======================================================================
#                                            vim:set ts=4 sw=4 nowrap :
